export interface N8nWorkflowJson {
  name?: string;
  nodes: N8nNode[];
  connections: N8nConnections;
  active?: boolean;
  settings?: Record<string, unknown>;
  staticData?: unknown;
  tags?: Array<{ name: string }>;
  pinData?: Record<string, unknown>;
  versionId?: string;
}

export interface N8nNode {
  id?: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, { id?: string; name: string }>;
  disabled?: boolean;
  notes?: string;
  notesInFlow?: boolean;
  webhookId?: string;
  continueOnFail?: boolean;
  alwaysOutputData?: boolean;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
}

export interface N8nConnections {
  [nodeName: string]: {
    [outputType: string]: Array<Array<{
      node: string;
      type: string;
      index: number;
    }>>;
  };
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  workflow_json: N8nWorkflowJson;
  is_active: boolean;
  node_count: number;
  has_unsupported_nodes: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowListItem {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  node_count: number;
  has_unsupported_nodes: boolean;
  last_execution_status?: string;
  last_execution_at?: string;
  created_at: string;
  updated_at: string;
}
