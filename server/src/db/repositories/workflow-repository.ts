import { supabase } from '../../lib/supabase';

export interface WorkflowRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  workflow_json: any;
  is_active: boolean;
  node_count: number;
  has_unsupported_nodes: boolean;
  created_at: string;
  updated_at: string;
  last_execution_status?: string;
  last_execution_at?: string;
}

export const workflowRepo = {
  async findAll(userId: string): Promise<WorkflowRow[]> {
    const { data: workflows, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch workflows: ${error.message}`);
    if (!workflows) return [];

    // Get latest execution status for each workflow
    const workflowIds = workflows.map(w => w.id);
    if (workflowIds.length === 0) return workflows;

    const { data: executions } = await supabase
      .from('executions')
      .select('workflow_id, status, created_at')
      .in('workflow_id', workflowIds)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const latestExecMap = new Map<string, { status: string; created_at: string }>();
    if (executions) {
      for (const e of executions) {
        if (!latestExecMap.has(e.workflow_id)) {
          latestExecMap.set(e.workflow_id, { status: e.status, created_at: e.created_at });
        }
      }
    }

    return workflows.map(w => ({
      ...w,
      workflow_json: typeof w.workflow_json === 'string' ? w.workflow_json : JSON.stringify(w.workflow_json),
      last_execution_status: latestExecMap.get(w.id)?.status,
      last_execution_at: latestExecMap.get(w.id)?.created_at,
    }));
  },

  async findById(id: string, userId: string): Promise<WorkflowRow | undefined> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) return undefined;
    return {
      ...data,
      workflow_json: typeof data.workflow_json === 'string' ? data.workflow_json : JSON.stringify(data.workflow_json),
    };
  },

  // Internal: find by ID without user check (for webhook/executor use)
  async findByIdInternal(id: string): Promise<WorkflowRow | undefined> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return {
      ...data,
      workflow_json: typeof data.workflow_json === 'string' ? data.workflow_json : JSON.stringify(data.workflow_json),
    };
  },

  async create(userId: string, data: { name: string; description?: string; workflow_json: string; node_count: number; has_unsupported_nodes: boolean }): Promise<string> {
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(data.workflow_json);
    } catch {
      parsedJson = { name: data.name, nodes: [], connections: {} };
    }

    const { data: row, error } = await supabase
      .from('workflows')
      .insert({
        user_id: userId,
        name: data.name,
        description: data.description || '',
        workflow_json: parsedJson,
        node_count: data.node_count,
        has_unsupported_nodes: data.has_unsupported_nodes,
      })
      .select('id')
      .single();

    if (error || !row) throw new Error(`Failed to create workflow: ${error?.message}`);
    return row.id;
  },

  async update(id: string, userId: string, fields: { name?: string; description?: string; workflow_json?: string; is_active?: boolean; node_count?: number; has_unsupported_nodes?: boolean }): Promise<boolean> {
    const updates: Record<string, unknown> = {};

    if (fields.name !== undefined) updates.name = fields.name;
    if (fields.description !== undefined) updates.description = fields.description;
    if (fields.is_active !== undefined) updates.is_active = fields.is_active;
    if (fields.node_count !== undefined) updates.node_count = fields.node_count;
    if (fields.has_unsupported_nodes !== undefined) updates.has_unsupported_nodes = fields.has_unsupported_nodes;
    if (fields.workflow_json !== undefined) {
      try {
        updates.workflow_json = JSON.parse(fields.workflow_json);
      } catch {
        updates.workflow_json = fields.workflow_json;
      }
    }

    if (Object.keys(updates).length === 0) return true;

    const { data: rows, error } = await supabase
      .from('workflows')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) throw new Error(`Failed to update workflow: ${error.message}`);
    return (rows?.length ?? 0) > 0;
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const { data: rows, error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) throw new Error(`Failed to delete workflow: ${error.message}`);
    return (rows?.length ?? 0) > 0;
  },

  async duplicate(id: string, userId: string): Promise<string | null> {
    const existing = await this.findById(id, userId);
    if (!existing) return null;
    return this.create(userId, {
      name: `${existing.name} (Copy)`,
      description: existing.description,
      workflow_json: existing.workflow_json,
      node_count: existing.node_count,
      has_unsupported_nodes: existing.has_unsupported_nodes,
    });
  },

  // Used by webhook route to find workflows by active status across all users
  async findAllActive(): Promise<WorkflowRow[]> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('is_active', true);

    if (error || !data) return [];
    return data.map(w => ({
      ...w,
      workflow_json: typeof w.workflow_json === 'string' ? w.workflow_json : JSON.stringify(w.workflow_json),
    }));
  },
};
