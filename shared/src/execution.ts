export type ExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'cancelled';
export type TriggerType = 'manual' | 'webhook' | 'schedule';

export interface Execution {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  status: ExecutionStatus;
  trigger_type: TriggerType;
  error?: string;
  started_at: string;
  finished_at?: string;
  created_at: string;
}

export interface NodeExecution {
  id: string;
  execution_id: string;
  node_name: string;
  node_type: string;
  status: ExecutionStatus;
  input_data?: unknown;
  output_data?: unknown;
  error?: string;
  execution_time_ms: number;
  started_at: string;
  finished_at?: string;
}

export interface ExecutionDetail extends Execution {
  node_executions: NodeExecution[];
}

export interface SSEEvent {
  type: 'execution:start' | 'node:start' | 'node:complete' | 'node:error' | 'execution:complete' | 'execution:error';
  executionId: string;
  data: {
    nodeName?: string;
    nodeType?: string;
    status?: ExecutionStatus;
    output?: unknown;
    error?: string;
    executionTimeMs?: number;
    timestamp: string;
  };
}
