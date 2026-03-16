import { v4 as uuid } from 'uuid';
import { getDb, saveDatabase } from '../schema';

export interface ExecutionRow {
  id: string;
  workflow_id: string;
  status: string;
  trigger_type: string;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface NodeExecutionRow {
  id: string;
  execution_id: string;
  node_name: string;
  node_type: string;
  status: string;
  input_data: string | null;
  output_data: string | null;
  error: string | null;
  execution_time_ms: number;
  started_at: string | null;
  finished_at: string | null;
}

export const executionRepo = {
  findAll(workflowId?: string, limit = 50): (ExecutionRow & { workflow_name?: string })[] {
    let sql = `
      SELECT e.*, w.name as workflow_name
      FROM executions e
      LEFT JOIN workflows w ON w.id = e.workflow_id
    `;
    const params: unknown[] = [];
    if (workflowId) {
      sql += ' WHERE e.workflow_id = ?';
      params.push(workflowId);
    }
    sql += ' ORDER BY e.created_at DESC LIMIT ?';
    params.push(limit);

    const stmt = getDb().prepare(sql);
    stmt.bind(params);
    const rows: (ExecutionRow & { workflow_name?: string })[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as ExecutionRow & { workflow_name?: string });
    }
    stmt.free();
    return rows;
  },

  findById(id: string): ExecutionRow | undefined {
    const stmt = getDb().prepare('SELECT e.*, w.name as workflow_name FROM executions e LEFT JOIN workflows w ON w.id = e.workflow_id WHERE e.id = ?');
    stmt.bind([id]);
    let row: ExecutionRow | undefined;
    if (stmt.step()) {
      row = stmt.getAsObject() as unknown as ExecutionRow;
    }
    stmt.free();
    return row;
  },

  create(workflowId: string, triggerType: string = 'manual'): string {
    const id = uuid();
    const now = new Date().toISOString();
    getDb().run(
      'INSERT INTO executions (id, workflow_id, status, trigger_type, started_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, workflowId, 'running', triggerType, now, now]
    );
    saveDatabase();
    return id;
  },

  updateStatus(id: string, status: string, error?: string) {
    const finished = status === 'success' || status === 'error' || status === 'cancelled';
    getDb().run(
      'UPDATE executions SET status = ?, error = ?, finished_at = ? WHERE id = ?',
      [status, error || null, finished ? new Date().toISOString() : null, id]
    );
    saveDatabase();
  },

  getNodeExecutions(executionId: string): NodeExecutionRow[] {
    const stmt = getDb().prepare('SELECT * FROM node_executions WHERE execution_id = ? ORDER BY started_at ASC');
    stmt.bind([executionId]);
    const rows: NodeExecutionRow[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as NodeExecutionRow);
    }
    stmt.free();
    return rows;
  },

  createNodeExecution(data: { executionId: string; nodeName: string; nodeType: string }): string {
    const id = uuid();
    const now = new Date().toISOString();
    getDb().run(
      'INSERT INTO node_executions (id, execution_id, node_name, node_type, status, started_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, data.executionId, data.nodeName, data.nodeType, 'running', now]
    );
    saveDatabase();
    return id;
  },

  updateNodeExecution(id: string, data: { status: string; outputData?: string; inputData?: string; error?: string; executionTimeMs?: number }) {
    getDb().run(
      'UPDATE node_executions SET status = ?, output_data = ?, input_data = ?, error = ?, execution_time_ms = ?, finished_at = ? WHERE id = ?',
      [data.status, data.outputData || null, data.inputData || null, data.error || null, data.executionTimeMs || 0, new Date().toISOString(), id]
    );
    saveDatabase();
  },
};
