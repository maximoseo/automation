import { Router, Request, Response } from 'express';
import { credentialRepo } from '../db/repositories/credential-repository';

export const credentialRoutes = Router();

// List credentials (without sensitive data)
credentialRoutes.get('/', (_req: Request, res: Response) => {
  const credentials = credentialRepo.findAll();
  res.json({ success: true, data: credentials });
});

// Get credential (without sensitive data)
credentialRoutes.get('/:id', (req: Request, res: Response) => {
  const credential = credentialRepo.findById(req.params.id);
  if (!credential) {
    res.status(404).json({ success: false, error: 'Credential not found' });
    return;
  }
  // Don't expose encrypted data
  const { data, ...rest } = credential;
  res.json({ success: true, data: rest });
});

// Create credential
credentialRoutes.post('/', (req: Request, res: Response) => {
  const { name, type, data } = req.body;
  if (!name || !type || !data) {
    res.status(400).json({ success: false, error: 'Name, type, and data are required' });
    return;
  }

  const id = credentialRepo.create({ name, type, data });
  res.status(201).json({ success: true, data: { id } });
});

// Update credential
credentialRoutes.put('/:id', (req: Request, res: Response) => {
  const { name, type, data } = req.body;
  const ok = credentialRepo.update(req.params.id, { name, type, data });
  if (!ok) {
    res.status(404).json({ success: false, error: 'Credential not found' });
    return;
  }
  res.json({ success: true });
});

// Delete credential
credentialRoutes.delete('/:id', (req: Request, res: Response) => {
  const ok = credentialRepo.delete(req.params.id);
  if (!ok) {
    res.status(404).json({ success: false, error: 'Credential not found' });
    return;
  }
  res.json({ success: true });
});
