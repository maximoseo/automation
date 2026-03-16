import { Router, Request, Response } from 'express';
import { workflowRepo } from '../db/repositories/workflow-repository';
import { executionRepo } from '../db/repositories/execution-repository';
import { executeWorkflow } from '../engine/executor';
import { N8nWorkflowJson } from '../../../shared/src/workflow';

export const webhookRoutes = Router();

// Dynamic webhook handler
webhookRoutes.all('/:webhookId', async (req: Request, res: Response) => {
  const { webhookId } = req.params;

  // Find workflow with matching webhook
  const workflows = workflowRepo.findAll();
  let matchedWorkflow: { id: string; workflow_json: string } | undefined;
  let matchedNode: any;

  for (const wf of workflows) {
    if (!wf.is_active) continue;
    try {
      const json: N8nWorkflowJson = JSON.parse(wf.workflow_json);
      for (const node of json.nodes) {
        if (node.type === 'n8n-nodes-base.webhook') {
          const path = (node.parameters.path as string) || '';
          if (path === webhookId || node.webhookId === webhookId) {
            matchedWorkflow = wf;
            matchedNode = node;
            break;
          }
        }
      }
    } catch { /* skip */ }
    if (matchedWorkflow) break;
  }

  if (!matchedWorkflow) {
    res.status(404).json({ error: 'Webhook not found' });
    return;
  }

  const json: N8nWorkflowJson = JSON.parse(matchedWorkflow.workflow_json);
  const executionId = executionRepo.create(matchedWorkflow.id, 'webhook');

  const triggerData = {
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params,
    method: req.method,
    url: req.url,
  };

  // Start execution asynchronously
  executeWorkflow(json, executionId, triggerData).catch(err => {
    console.error(`Webhook execution ${executionId} failed:`, err);
  });

  const responseMode = matchedNode?.parameters?.responseMode;
  if (responseMode === 'lastNode') {
    // Wait a bit for execution
    await new Promise(r => setTimeout(r, 5000));
    const exec = executionRepo.findById(executionId);
    res.json({ executionId, status: exec?.status || 'running' });
  } else {
    res.json({ executionId, message: 'Webhook received, execution started' });
  }
});
