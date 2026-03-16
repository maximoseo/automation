import { v4 as uuid } from 'uuid';
import { getDb, saveDatabase } from '../schema';

export interface WorkflowRow {
  id: string;
  name: string;
  description: string;
  workflow_json: string;
  is_active: number;
  node_count: number;
  has_unsupported_nodes: number;
  created_at: string;
  updated_at: string;
}

export const workflowRepo = {
  findAll(): WorkflowRow[] {
    const stmt = getDb().prepare(`
      SELECT w.*, e.status as last_execution_status, e.created_at as last_execution_at
      FROM workflows w
      LEFT JOIN (
        SELECT workflow_id, status, created_at,
          ROW_NUMBER() OVER (PARTITION BY workflow_id ORDER BY created_at DESC) as rn
        FROM executions
      ) e ON e.workflow_id = w.id AND e.rn = 1
      ORDER BY w.updated_at DESC
    `);
    const rows: WorkflowRow[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as WorkflowRow);
    }
    stmt.free();
    return rows;
  },

  findById(id: string): WorkflowRow | undefined {
    const stmt = getDb().prepare('SELECT * FROM workflows WHERE id = ?');
    stmt.bind([id]);
    let row: WorkflowRow | undefined;
    if (stmt.step()) {
      row = stmt.getAsObject() as unknown as WorkflowRow;
    }
    stmt.free();
    return row;
  },

  create(data: { name: string; description?: string; workflow_json: string; node_count: number; has_unsupported_nodes: boolean }): string {
    const id = uuid();
    const now = new Date().toISOString();
    getDb().run(
      `INSERT INTO workflows (id, name, description, workflow_json, node_count, has_unsupported_nodes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.description || '', data.workflow_json, data.node_count, data.has_unsupported_nodes ? 1 : 0, now, now]
    );
    saveDatabase();
    return id;
  },

  update(id: string, data: { name?: string; description?: string; workflow_json?: string; is_active?: boolean; node_count?: number; has_unsupported_nodes?: boolean }): boolean {
    const existing = this.findById(id);
    if (!existing) return false;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.workflow_json !== undefined) { updates.push('workflow_json = ?'); values.push(data.workflow_json); }
    if (data.is_active !== undefined) { updates.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }
    if (data.node_count !== undefined) { updates.push('node_count = ?'); values.push(data.node_count); }
    if (data.has_unsupported_nodes !== undefined) { updates.push('has_unsupported_nodes = ?'); values.push(data.has_unsupported_nodes ? 1 : 0); }

    if (updates.length === 0) return true;

    updates.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(id);

    getDb().run(`UPDATE workflows SET ${updates.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  },

  delete(id: string): boolean {
    const existing = this.findById(id);
    if (!existing) return false;
    getDb().run('DELETE FROM workflows WHERE id = ?', [id]);
    saveDatabase();
    return true;
  },

  duplicate(id: string): string | null {
    const existing = this.findById(id);
    if (!existing) return null;
    return this.create({
      name: `${existing.name} (Copy)`,
      description: existing.description,
      workflow_json: existing.workflow_json,
      node_count: existing.node_count,
      has_unsupported_nodes: existing.has_unsupported_nodes === 1,
    });
  },
};
