import { v4 as uuid } from 'uuid';
import { getDb, saveDatabase } from '../schema';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

function getKeyBuffer(): Buffer {
  return Buffer.from(KEY.slice(0, 64).padEnd(64, '0'), 'hex');
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKeyBuffer(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKeyBuffer(), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export interface CredentialRow {
  id: string;
  name: string;
  type: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export const credentialRepo = {
  findAll(): Omit<CredentialRow, 'data'>[] {
    const stmt = getDb().prepare('SELECT id, name, type, created_at, updated_at FROM credentials ORDER BY updated_at DESC');
    const rows: Omit<CredentialRow, 'data'>[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as Omit<CredentialRow, 'data'>);
    }
    stmt.free();
    return rows;
  },

  findById(id: string): CredentialRow | undefined {
    const stmt = getDb().prepare('SELECT * FROM credentials WHERE id = ?');
    stmt.bind([id]);
    let row: CredentialRow | undefined;
    if (stmt.step()) {
      row = stmt.getAsObject() as unknown as CredentialRow;
    }
    stmt.free();
    return row;
  },

  findByType(type: string): CredentialRow[] {
    const stmt = getDb().prepare('SELECT * FROM credentials WHERE type = ?');
    stmt.bind([type]);
    const rows: CredentialRow[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as CredentialRow);
    }
    stmt.free();
    return rows;
  },

  create(data: { name: string; type: string; data: Record<string, unknown> }): string {
    const id = uuid();
    const now = new Date().toISOString();
    const encryptedData = encrypt(JSON.stringify(data.data));
    getDb().run(
      'INSERT INTO credentials (id, name, type, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, data.name, data.type, encryptedData, now, now]
    );
    saveDatabase();
    return id;
  },

  update(id: string, data: { name?: string; type?: string; data?: Record<string, unknown> }): boolean {
    const existing = this.findById(id);
    if (!existing) return false;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.type !== undefined) { updates.push('type = ?'); values.push(data.type); }
    if (data.data !== undefined) { updates.push('data = ?'); values.push(encrypt(JSON.stringify(data.data))); }

    if (updates.length === 0) return true;
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    getDb().run(`UPDATE credentials SET ${updates.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  },

  delete(id: string): boolean {
    const existing = this.findById(id);
    if (!existing) return false;
    getDb().run('DELETE FROM credentials WHERE id = ?', [id]);
    saveDatabase();
    return true;
  },

  getDecryptedData(id: string): Record<string, unknown> | null {
    const row = this.findById(id);
    if (!row) return null;
    try {
      return JSON.parse(decrypt(row.data));
    } catch {
      return null;
    }
  },
};
