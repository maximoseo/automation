import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { executionRepo } from '../db/repositories/execution-repository';
import { sseService } from '../services/sse';

export const executionRoutes = Router();

// List executions
executionRoutes.get('/', (req: Request, res: Response) => {
  const workflowId = req.query.workflow_id as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const executions = executionRepo.findAll(workflowId, limit);
  res.json({ success: true, data: executions });
});

// Get execution detail
executionRoutes.get('/:id', (req: Request, res: Response) => {
  const execution = executionRepo.findById(req.params.id);
  if (!execution) {
    res.status(404).json({ success: false, error: 'Execution not found' });
    return;
  }

  const nodeExecutions = executionRepo.getNodeExecutions(req.params.id);
  res.json({
    success: true,
    data: {
      ...execution,
      node_executions: nodeExecutions.map(ne => ({
        ...ne,
        input_data: ne.input_data ? JSON.parse(ne.input_data) : null,
        output_data: ne.output_data ? JSON.parse(ne.output_data) : null,
      })),
    },
  });
});

// SSE stream for execution
executionRoutes.get('/:id/stream', (req: Request, res: Response) => {
  const executionId = req.params.id;
  const clientId = uuid();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

  sseService.addClient(executionId, clientId, res);

  // Send current state
  const execution = executionRepo.findById(executionId);
  if (execution) {
    res.write(`event: execution:state\ndata: ${JSON.stringify(execution)}\n\n`);
    const nodeExecs = executionRepo.getNodeExecutions(executionId);
    for (const ne of nodeExecs) {
      res.write(`event: node:state\ndata: ${JSON.stringify({
        ...ne,
        input_data: ne.input_data ? JSON.parse(ne.input_data) : null,
        output_data: ne.output_data ? JSON.parse(ne.output_data) : null,
      })}\n\n`);
    }
  }
});
