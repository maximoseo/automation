import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/utils';

interface WorkflowListItem {
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

interface WorkflowDetail {
  id: string;
  name: string;
  description: string;
  workflow_json: any;
  is_active: boolean;
  node_count: number;
  has_unsupported_nodes: boolean;
  created_at: string;
  updated_at: string;
}

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: () => apiFetch<{ data: WorkflowListItem[] }>('/workflows').then(r => r.data),
  });
}

export function useWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: () => apiFetch<{ data: WorkflowDetail }>(`/workflows/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/workflows/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  });
}

export function useDuplicateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<{ data: { id: string } }>(`/workflows/${id}/duplicate`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  });
}

export function useSaveWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; workflow_json?: any }) =>
      apiFetch(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
      qc.invalidateQueries({ queryKey: ['workflow', vars.id] });
    },
  });
}

export function useImportWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (json: any) =>
      apiFetch<{ data: { workflow_id: string; name: string; node_count: number; warnings: string[] } }>('/workflows/import', {
        method: 'POST',
        body: JSON.stringify(json),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  });
}

export function useExecuteWorkflow() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: { execution_id: string } }>(`/workflows/${id}/execute`, { method: 'POST' }),
  });
}
