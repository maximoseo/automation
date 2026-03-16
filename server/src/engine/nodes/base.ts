export interface NodeInput {
  items: Array<{ json: Record<string, unknown> }>;
}

export interface NodeOutput {
  items: Array<{ json: Record<string, unknown> }>;
}

export interface NodeExecutorContext {
  nodeName: string;
  nodeType: string;
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  input: Record<number, NodeInput>; // input by index
  allNodeOutputs: Map<string, NodeOutput[]>; // all previous node outputs
}

export type NodeExecutor = (context: NodeExecutorContext) => Promise<NodeOutput[]>;
