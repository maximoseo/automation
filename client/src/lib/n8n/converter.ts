import { Node, Edge } from '@xyflow/react';
import { NODE_TYPE_CONFIGS } from '@shared/node';

interface N8nWorkflowJson {
  name?: string;
  nodes: Array<{
    id?: string;
    name: string;
    type: string;
    typeVersion?: number;
    position: [number, number];
    parameters: Record<string, unknown>;
    credentials?: Record<string, { id?: string; name: string }>;
    disabled?: boolean;
    webhookId?: string;
  }>;
  connections: Record<string, {
    [outputType: string]: Array<Array<{ node: string; type: string; index: number }>>;
  }>;
}

export function n8nToReactFlow(workflow: N8nWorkflowJson): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeNameToId = new Map<string, string>();

  for (let i = 0; i < workflow.nodes.length; i++) {
    const n8nNode = workflow.nodes[i];
    const id = n8nNode.id || `node_${i}`;
    nodeNameToId.set(n8nNode.name, id);

    const config = NODE_TYPE_CONFIGS[n8nNode.type];

    nodes.push({
      id,
      type: 'workflowNode',
      position: { x: n8nNode.position[0], y: n8nNode.position[1] },
      data: {
        label: n8nNode.name,
        nodeType: n8nNode.type,
        parameters: n8nNode.parameters || {},
        credentials: n8nNode.credentials,
        disabled: n8nNode.disabled || false,
        webhookId: n8nNode.webhookId,
        supportLevel: config?.supportLevel || 'unsupported',
        icon: config?.icon || 'Box',
        color: config?.color || '#6b7280',
        displayName: config?.displayName || n8nNode.type.split('.').pop() || 'Unknown',
        category: config?.category || 'action',
        outputs: config?.outputs ?? 1,
        inputs: config?.inputs ?? 1,
      },
    });
  }

  if (workflow.connections) {
    let edgeIndex = 0;
    for (const [fromNodeName, outputs] of Object.entries(workflow.connections)) {
      const mainOutputs = outputs.main;
      if (!mainOutputs) continue;

      for (let outputIndex = 0; outputIndex < mainOutputs.length; outputIndex++) {
        const conns = mainOutputs[outputIndex];
        if (!conns) continue;

        for (const conn of conns) {
          const sourceId = nodeNameToId.get(fromNodeName);
          const targetId = nodeNameToId.get(conn.node);
          if (!sourceId || !targetId) continue;

          edges.push({
            id: `edge_${edgeIndex++}`,
            source: sourceId,
            target: targetId,
            sourceHandle: `output_${outputIndex}`,
            targetHandle: `input_${conn.index || 0}`,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#7c3aed', strokeWidth: 2 },
          });
        }
      }
    }
  }

  return { nodes, edges };
}

export function reactFlowToN8n(nodes: Node[], edges: Edge[], workflowName: string): N8nWorkflowJson {
  const n8nNodes = nodes.map(node => ({
    id: node.id,
    name: (node.data.label as string) || node.id,
    type: (node.data.nodeType as string) || 'n8n-nodes-base.noOp',
    typeVersion: 1,
    position: [Math.round(node.position.x), Math.round(node.position.y)] as [number, number],
    parameters: (node.data.parameters as Record<string, unknown>) || {},
    credentials: node.data.credentials as Record<string, { id?: string; name: string }> | undefined,
    disabled: (node.data.disabled as boolean) || false,
    webhookId: node.data.webhookId as string | undefined,
  }));

  const connections: N8nWorkflowJson['connections'] = {};

  for (const edge of edges) {
    const sourceNode = nodes.find(n => n.id === edge.source);
    if (!sourceNode) continue;
    const sourceName = (sourceNode.data.label as string) || sourceNode.id;
    const outputIndex = edge.sourceHandle ? parseInt(edge.sourceHandle.replace('output_', '')) || 0 : 0;
    const targetNode = nodes.find(n => n.id === edge.target);
    if (!targetNode) continue;
    const targetName = (targetNode.data.label as string) || targetNode.id;
    const targetIndex = edge.targetHandle ? parseInt(edge.targetHandle.replace('input_', '')) || 0 : 0;

    if (!connections[sourceName]) {
      connections[sourceName] = { main: [] };
    }
    while (connections[sourceName].main.length <= outputIndex) {
      connections[sourceName].main.push([]);
    }
    connections[sourceName].main[outputIndex].push({
      node: targetName,
      type: 'main',
      index: targetIndex,
    });
  }

  return {
    name: workflowName,
    nodes: n8nNodes,
    connections,
  };
}
