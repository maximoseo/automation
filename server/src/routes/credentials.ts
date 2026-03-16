import { Router, Response } from 'express';
import { credentialRepo } from '../db/repositories/credential-repository';
import '../middleware/auth'; // augments Express.Request with userId

export const credentialRoutes = Router();

// List credentials (without sensitive data)
credentialRoutes.get('/', async (req, res: Response) => {
  try {
    const userId = req.userId!;
    const credentials = await credentialRepo.findAll(userId);
    res.json({ success: true, data: credentials });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// Get credential (without sensitive data)
credentialRoutes.get('/:id', async (req, res: Response) => {
  try {
    const userId = req.userId!;
    const credential = await credentialRepo.findById(req.params.id, userId);
    if (!credential) {
      res.status(404).json({ success: false, error: 'Credential not found' });
      return;
    }
    const { data, ...rest } = credential;
    res.json({ success: true, data: rest });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// Create credential
credentialRoutes.post('/', async (req, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, type, data } = req.body;
    if (!name || !type || !data) {
      res.status(400).json({ success: false, error: 'Name, type, and data are required' });
      return;
    }

    const id = await credentialRepo.create(userId, { name, type, data });
    res.status(201).json({ success: true, data: { id } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// Update credential
credentialRoutes.put('/:id', async (req, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, type, data } = req.body;
    const ok = await credentialRepo.update(req.params.id, userId, { name, type, data });
    if (!ok) {
      res.status(404).json({ success: false, error: 'Credential not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// Delete credential
credentialRoutes.delete('/:id', async (req, res: Response) => {
  try {
    const userId = req.userId!;
    const ok = await credentialRepo.delete(req.params.id, userId);
    if (!ok) {
      res.status(404).json({ success: false, error: 'Credential not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});
