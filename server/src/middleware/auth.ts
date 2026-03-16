import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

// Lightweight client for JWT validation only
const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Augment Express Request to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

    req.userId = data.user.id;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Authentication failed' });
  }
}
