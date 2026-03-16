import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { executionRepo } from '../db/repositories/execution-repository';
import { sseService } from '../services/sse';
import '../middleware/auth'; // augments Express.Request with userId

export const executionRoutes = Router();

// List executions
executionRoutes.get('/', async (req, res: Response) => {
  try {
    const userId = req.userId!;
    const workflowId = req.query.workflow_id as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const executions = await executionRepo.findAll(userId, workflowId, limit);
    res.json({ success: true, data: executions });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// Get execution detail
executionRoutes.get('/:id', async (req, res: Response) => {
  try {
    const userId = req.userId!;
    const execution = await executionRepo.findById(req.params.id, userId);
    if (!execution) {
      res.status(404).json({ success: false, error: 'Execution not found' });
      return;
    }

    const nodeExecutions = await executionRepo.getNodeExecutions(req.params.id);
    res.json({
      success: true,
      data: {
        ...execution,
        node_executions: nodeExecutions,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// SSE stream for execution
executionRoutes.get('/:id/stream', async (req, res: Response) => {
  const executionId = req.params.id;
  const clientId = uuid();
  const userId = req.userId!;

  // Verify ownership before streaming
  const execution = await executionRepo.findById(executionId, userId);
  if (!execution) {
    res.status(404).json({ success: false, error: 'Execution not found' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

  sseService.addClient(executionId, clientId, res);

  // Send current state
  res.write(`event: execution:state\ndata: ${JSON.stringify(execution)}\n\n`);
  const nodeExecs = await executionRepo.getNodeExecutions(executionId);
  for (const ne of nodeExecs) {
    res.write(`event: node:state\ndata: ${JSON.stringify(ne)}\n\n`);
  }
});
