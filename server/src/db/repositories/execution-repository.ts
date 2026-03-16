import { supabase } from '../../lib/supabase';

export interface ExecutionRow {
  id: string;
  workflow_id: string;
  user_id: string;
  status: string;
  trigger_type: string;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  workflow_name?: string;
}

export interface NodeExecutionRow {
  id: string;
  execution_id: string;
  node_name: string;
  node_type: string;
  status: string;
  input_data: any;
  output_data: any;
  error: string | null;
  execution_time_ms: number;
  started_at: string | null;
  finished_at: string | null;
}

export const executionRepo = {
  async findAll(userId: string, workflowId?: string, limit = 50): Promise<ExecutionRow[]> {
    let query = supabase
      .from('executions')
      .select('*, workflows(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (workflowId) {
      query = query.eq('workflow_id', workflowId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch executions: ${error.message}`);

    return (data || []).map(e => ({
      ...e,
      workflow_name: (e.workflows as any)?.name,
      workflows: undefined,
    }));
  },

  async findById(id: string, userId?: string): Promise<ExecutionRow | undefined> {
    let query = supabase
      .from('executions')
      .select('*, workflows(name)')
      .eq('id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error || !data) return undefined;
    return {
      ...data,
      workflow_name: (data.workflows as any)?.name,
      workflows: undefined,
    };
  },

  async create(workflowId: string, userId: string, triggerType: string = 'manual'): Promise<string> {
    const { data, error } = await supabase
      .from('executions')
      .insert({
        workflow_id: workflowId,
        user_id: userId,
        status: 'running',
        trigger_type: triggerType,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !data) throw new Error(`Failed to create execution: ${error?.message}`);
    return data.id;
  },

  async updateStatus(id: string, status: string, error?: string) {
    const finished = status === 'success' || status === 'error' || status === 'cancelled';
    const { error: dbError } = await supabase
      .from('executions')
      .update({
        status,
        error: error || null,
        finished_at: finished ? new Date().toISOString() : null,
      })
      .eq('id', id);

    if (dbError) console.error(`Failed to update execution status: ${dbError.message}`);
  },

  async getNodeExecutions(executionId: string): Promise<NodeExecutionRow[]> {
    const { data, error } = await supabase
      .from('node_executions')
      .select('*')
      .eq('execution_id', executionId)
      .order('started_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch node executions: ${error.message}`);
    return data || [];
  },

  async createNodeExecution(data: { executionId: string; nodeName: string; nodeType: string }): Promise<string> {
    const { data: row, error } = await supabase
      .from('node_executions')
      .insert({
        execution_id: data.executionId,
        node_name: data.nodeName,
        node_type: data.nodeType,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !row) throw new Error(`Failed to create node execution: ${error?.message}`);
    return row.id;
  },

  async updateNodeExecution(id: string, data: { status: string; outputData?: string; inputData?: string; error?: string; executionTimeMs?: number }) {
    let outputParsed: any = null;
    let inputParsed: any = null;

    if (data.outputData) {
      try { outputParsed = JSON.parse(data.outputData); } catch { outputParsed = data.outputData; }
    }
    if (data.inputData) {
      try { inputParsed = JSON.parse(data.inputData); } catch { inputParsed = data.inputData; }
    }

    const { error: dbError } = await supabase
      .from('node_executions')
      .update({
        status: data.status,
        output_data: outputParsed,
        input_data: inputParsed,
        error: data.error || null,
        execution_time_ms: data.executionTimeMs || 0,
        finished_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (dbError) console.error(`Failed to update node execution: ${dbError.message}`);
  },
};
