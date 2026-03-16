import { Router, Request, Response } from 'express';
import { workflowRepo } from '../db/repositories/workflow-repository';
import { executionRepo } from '../db/repositories/execution-repository';
import { executeWorkflow } from '../engine/executor';
import { NODE_TYPE_CONFIGS, getNodeSupportLevel } from '../../../shared/src/node';
import { N8nWorkflowJson } from '../../../shared/src/workflow';

export const workflowRoutes = Router();

// List all workflows
workflowRoutes.get('/', (_req: Request, res: Response) => {
  const workflows = workflowRepo.findAll();
  res.json({
    success: true,
    data: workflows.map(w => ({
      ...w,
      is_active: Boolean(w.is_active),
      has_unsupported_nodes: Boolean(w.has_unsupported_nodes),
    })),
  });
});

// Get single workflow
workflowRoutes.get('/:id', (req: Request, res: Response) => {
  const workflow = workflowRepo.findById(req.params.id);
  if (!workflow) {
    res.status(404).json({ success: false, error: 'Workflow not found' });
    return;
  }
  res.json({
    success: true,
    data: {
      ...workflow,
      workflow_json: JSON.parse(workflow.workflow_json),
      is_active: Boolean(workflow.is_active),
      has_unsupported_nodes: Boolean(workflow.has_unsupported_nodes),
    },
  });
});

// Create workflow
workflowRoutes.post('/', (req: Request, res: Response) => {
  const { name, description, workflow_json } = req.body;
  if (!name) {
    res.status(400).json({ success: false, error: 'Name is required' });
    return;
  }

  const wfJson: N8nWorkflowJson = workflow_json || { name, nodes: [], connections: {} };
  const analysis = analyzeWorkflow(wfJson);

  const id = workflowRepo.create({
    name,
    description,
    workflow_json: JSON.stringify(wfJson),
    node_count: analysis.nodeCount,
    has_unsupported_nodes: analysis.hasUnsupported,
  });

  res.status(201).json({ success: true, data: { id } });
});

// Update workflow
workflowRoutes.put('/:id', (req: Request, res: Response) => {
  const { name, description, workflow_json, is_active } = req.body;
  const updates: Record<string, unknown> = {};

  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (is_active !== undefined) updates.is_active = is_active;

  if (workflow_json) {
    const analysis = analyzeWorkflow(workflow_json);
    updates.workflow_json = JSON.stringify(workflow_json);
    updates.node_count = analysis.nodeCount;
    updates.has_unsupported_nodes = analysis.hasUnsupported;
  }

  const ok = workflowRepo.update(req.params.id, updates as any);
  if (!ok) {
    res.status(404).json({ success: false, error: 'Workflow not found' });
    return;
  }
  res.json({ success: true });
});

// Delete workflow
workflowRoutes.delete('/:id', (req: Request, res: Response) => {
  const ok = workflowRepo.delete(req.params.id);
  if (!ok) {
    res.status(404).json({ success: false, error: 'Workflow not found' });
    return;
  }
  res.json({ success: true });
});

// Duplicate workflow
workflowRoutes.post('/:id/duplicate', (req: Request, res: Response) => {
  const newId = workflowRepo.duplicate(req.params.id);
  if (!newId) {
    res.status(404).json({ success: false, error: 'Workflow not found' });
    return;
  }
  res.status(201).json({ success: true, data: { id: newId } });
});

// Import n8n JSON
workflowRoutes.post('/import', (req: Request, res: Response) => {
  try {
    const workflowJson: N8nWorkflowJson = req.body;
    if (!workflowJson.nodes) {
      res.status(400).json({ success: false, error: 'Invalid n8n workflow JSON: missing nodes array' });
      return;
    }

    const name = workflowJson.name || 'Imported Workflow';
    const analysis = analyzeWorkflow(workflowJson);

    const id = workflowRepo.create({
      name,
      description: `Imported workflow with ${analysis.nodeCount} nodes`,
      workflow_json: JSON.stringify(workflowJson),
      node_count: analysis.nodeCount,
      has_unsupported_nodes: analysis.hasUnsupported,
    });

    res.status(201).json({
      success: true,
      data: {
        workflow_id: id,
        name,
        node_count: analysis.nodeCount,
        unsupported_nodes: analysis.unsupportedTypes,
        warnings: analysis.warnings,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, error: `Import failed: ${(err as Error).message}` });
  }
});

// Export workflow as n8n JSON
workflowRoutes.get('/:id/export', (req: Request, res: Response) => {
  const workflow = workflowRepo.findById(req.params.id);
  if (!workflow) {
    res.status(404).json({ success: false, error: 'Workflow not found' });
    return;
  }
  const json = JSON.parse(workflow.workflow_json);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${workflow.name.replace(/[^a-z0-9]/gi, '-')}.json"`);
  res.json(json);
});

// Validate workflow
workflowRoutes.get('/:id/validate', (req: Request, res: Response) => {
  const workflow = workflowRepo.findById(req.params.id);
  if (!workflow) {
    res.status(404).json({ success: false, error: 'Workflow not found' });
    return;
  }
  const json: N8nWorkflowJson = JSON.parse(workflow.workflow_json);
  const result = validateWorkflow(json);
  res.json({ success: true, data: result });
});

// Execute workflow
workflowRoutes.post('/:id/execute', async (req: Request, res: Response) => {
  const workflow = workflowRepo.findById(req.params.id);
  if (!workflow) {
    res.status(404).json({ success: false, error: 'Workflow not found' });
    return;
  }

  const json: N8nWorkflowJson = JSON.parse(workflow.workflow_json);
  const executionId = executionRepo.create(req.params.id, 'manual');

  res.json({ success: true, data: { execution_id: executionId } });

  // Run asynchronously
  executeWorkflow(json, executionId, req.body.triggerData).catch(err => {
    console.error(`Execution ${executionId} failed:`, err);
  });
});

// Helpers
function analyzeWorkflow(json: N8nWorkflowJson) {
  const nodes = json.nodes || [];
  const unsupportedTypes: string[] = [];
  const warnings: string[] = [];

  for (const node of nodes) {
    const level = getNodeSupportLevel(node.type);
    if (level === 'unsupported') {
      unsupportedTypes.push(node.type);
    } else if (level === 'partial') {
      warnings.push(`Node "${node.name}" (${node.type}) has partial support - may use simulated execution`);
    }
  }

  return {
    nodeCount: nodes.length,
    hasUnsupported: unsupportedTypes.length > 0,
    unsupportedTypes,
    warnings,
  };
}

function validateWorkflow(json: N8nWorkflowJson) {
  const errors: Array<{ node?: string; field?: string; message: string }> = [];
  const warnings: Array<{ node?: string; message: string }> = [];
  const nodeSupport: Array<{ name: string; type: string; level: string }> = [];

  if (!json.nodes || json.nodes.length === 0) {
    errors.push({ message: 'Workflow has no nodes' });
  }

  const nodeNames = new Set<string>();
  for (const node of json.nodes || []) {
    if (nodeNames.has(node.name)) {
      errors.push({ node: node.name, message: `Duplicate node name: ${node.name}` });
    }
    nodeNames.add(node.name);

    const level = getNodeSupportLevel(node.type);
    nodeSupport.push({ name: node.name, type: node.type, level });

    if (level === 'unsupported') {
      warnings.push({ node: node.name, message: `Node type "${node.type}" is not supported` });
    } else if (level === 'partial') {
      warnings.push({ node: node.name, message: `Node type "${node.type}" has partial support (needs credentials for full execution)` });
    }
  }

  // Check connections reference existing nodes
  if (json.connections) {
    for (const [fromNode, outputs] of Object.entries(json.connections)) {
      if (!nodeNames.has(fromNode)) {
        errors.push({ message: `Connection references non-existent node: ${fromNode}` });
      }
      for (const outputConns of Object.values(outputs)) {
        for (const conns of outputConns) {
          for (const conn of conns) {
            if (!nodeNames.has(conn.node)) {
              errors.push({ message: `Connection references non-existent target node: ${conn.node}` });
            }
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    nodeSupport,
  };
}
