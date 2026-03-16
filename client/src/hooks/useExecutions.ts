import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/utils';

interface Execution {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  status: string;
  trigger_type: string;
  error?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
}

interface NodeExecution {
  id: string;
  execution_id: string;
  node_name: string;
  node_type: string;
  status: string;
  input_data?: unknown;
  output_data?: unknown;
  error?: string;
  execution_time_ms: number;
  started_at?: string;
  finished_at?: string;
}

interface ExecutionDetail extends Execution {
  node_executions: NodeExecution[];
}

export function useExecutions(workflowId?: string) {
  return useQuery({
    queryKey: ['executions', workflowId],
    queryFn: () => {
      const params = workflowId ? `?workflow_id=${workflowId}` : '';
      return apiFetch<{ data: Execution[] }>(`/executions${params}`).then(r => r.data);
    },
    refetchInterval: 5000,
  });
}

export function useExecution(id: string | undefined) {
  return useQuery({
    queryKey: ['execution', id],
    queryFn: () => apiFetch<{ data: ExecutionDetail }>(`/executions/${id}`).then(r => r.data),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as ExecutionDetail | undefined;
      return data?.status === 'running' ? 1000 : false;
    },
  });
}
