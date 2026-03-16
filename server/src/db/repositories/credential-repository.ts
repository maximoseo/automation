import crypto from 'crypto';
import { supabase } from '../../lib/supabase';

const ALGORITHM = 'aes-256-gcm';
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('Missing ENCRYPTION_KEY environment variable — credentials cannot be encrypted without it');
  }
  return key;
}

function getKeyBuffer(): Buffer {
  return Buffer.from(getEncryptionKey().slice(0, 64).padEnd(64, '0'), 'hex');
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
  user_id: string;
  name: string;
  type: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export const credentialRepo = {
  async findAll(userId: string): Promise<Omit<CredentialRow, 'data'>[]> {
    const { data, error } = await supabase
      .from('credentials')
      .select('id, user_id, name, type, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch credentials: ${error.message}`);
    return data || [];
  },

  async findById(id: string, userId: string): Promise<CredentialRow | undefined> {
    const { data, error } = await supabase
      .from('credentials')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) return undefined;
    return data;
  },

  async findByType(type: string, userId: string): Promise<CredentialRow[]> {
    const { data, error } = await supabase
      .from('credentials')
      .select('*')
      .eq('type', type)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to fetch credentials: ${error.message}`);
    return data || [];
  },

  async create(userId: string, data: { name: string; type: string; data: Record<string, unknown> }): Promise<string> {
    const encryptedData = encrypt(JSON.stringify(data.data));

    const { data: row, error } = await supabase
      .from('credentials')
      .insert({
        user_id: userId,
        name: data.name,
        type: data.type,
        data: encryptedData,
      })
      .select('id')
      .single();

    if (error || !row) throw new Error(`Failed to create credential: ${error?.message}`);
    return row.id;
  },

  async update(id: string, userId: string, data: { name?: string; type?: string; data?: Record<string, unknown> }): Promise<boolean> {
    const updates: Record<string, unknown> = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.type !== undefined) updates.type = data.type;
    if (data.data !== undefined) updates.data = encrypt(JSON.stringify(data.data));

    if (Object.keys(updates).length === 0) return true;

    const { error } = await supabase
      .from('credentials')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to update credential: ${error.message}`);
    return true;
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('credentials')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to delete credential: ${error.message}`);
    return true;
  },

  async getDecryptedData(id: string, userId: string): Promise<Record<string, unknown> | null> {
    const row = await this.findById(id, userId);
    if (!row) return null;
    try {
      return JSON.parse(decrypt(row.data));
    } catch {
      return null;
    }
  },
};
