import { N8nWorkflowJson, N8nNode, N8nConnections } from '../../../../shared/src/workflow';

export interface DAGNode {
  name: string;
  type: string;
  parameters: Record<string, unknown>;
  credentials?: Record<string, { id?: string; name: string }>;
  position: [number, number];
  disabled?: boolean;
  continueOnFail?: boolean;
}

export interface DAGEdge {
  from: string;
  to: string;
  fromOutput: number;
  toInput: number;
}

export interface DAG {
  nodes: Map<string, DAGNode>;
  edges: DAGEdge[];
  adjacency: Map<string, Array<{ node: string; outputIndex: number }>>;
  reverseAdjacency: Map<string, Array<{ node: string; outputIndex: number }>>;
  triggers: string[];
}

export function buildDAG(workflow: N8nWorkflowJson): DAG {
  const nodes = new Map<string, DAGNode>();
  const edges: DAGEdge[] = [];
  const adjacency = new Map<string, Array<{ node: string; outputIndex: number }>>();
  const reverseAdjacency = new Map<string, Array<{ node: string; outputIndex: number }>>();
  const triggers: string[] = [];

  // Build node map
  for (const n8nNode of workflow.nodes) {
    const node: DAGNode = {
      name: n8nNode.name,
      type: n8nNode.type,
      parameters: n8nNode.parameters || {},
      credentials: n8nNode.credentials,
      position: n8nNode.position,
      disabled: n8nNode.disabled,
      continueOnFail: n8nNode.continueOnFail,
    };
    nodes.set(n8nNode.name, node);
    adjacency.set(n8nNode.name, []);
    reverseAdjacency.set(n8nNode.name, []);

    // Identify triggers
    if (n8nNode.type.includes('Trigger') || n8nNode.type.includes('webhook')) {
      triggers.push(n8nNode.name);
    }
  }

  // Build edges from connections
  if (workflow.connections) {
    for (const [fromNodeName, outputs] of Object.entries(workflow.connections)) {
      const mainOutputs = outputs.main;
      if (!mainOutputs) continue;

      for (let outputIndex = 0; outputIndex < mainOutputs.length; outputIndex++) {
        const connections = mainOutputs[outputIndex];
        if (!connections) continue;

        for (const conn of connections) {
          const edge: DAGEdge = {
            from: fromNodeName,
            to: conn.node,
            fromOutput: outputIndex,
            toInput: conn.index || 0,
          };
          edges.push(edge);
          adjacency.get(fromNodeName)?.push({ node: conn.node, outputIndex });
          reverseAdjacency.get(conn.node)?.push({ node: fromNodeName, outputIndex });
        }
      }
    }
  }

  // If no trigger found, use nodes with no incoming edges
  if (triggers.length === 0) {
    for (const [name] of nodes) {
      const incoming = reverseAdjacency.get(name) || [];
      if (incoming.length === 0) {
        triggers.push(name);
      }
    }
  }

  return { nodes, edges, adjacency, reverseAdjacency, triggers };
}

export function topologicalSort(dag: DAG): string[] {
  const inDegree = new Map<string, number>();
  for (const [name] of dag.nodes) {
    inDegree.set(name, 0);
  }
  for (const edge of dag.edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) queue.push(name);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);

    const neighbors = dag.adjacency.get(node) || [];
    for (const { node: neighbor } of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  // Handle cycles (splitInBatches) - add remaining nodes
  for (const [name] of dag.nodes) {
    if (!sorted.includes(name)) {
      sorted.push(name);
    }
  }

  return sorted;
}
