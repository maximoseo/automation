import { Response } from 'express';

type SSEClient = { id: string; res: Response };

const clients = new Map<string, SSEClient[]>();

export const sseService = {
  addClient(executionId: string, clientId: string, res: Response) {
    if (!clients.has(executionId)) {
      clients.set(executionId, []);
    }
    clients.get(executionId)!.push({ id: clientId, res });

    res.on('close', () => {
      this.removeClient(executionId, clientId);
    });
  },

  removeClient(executionId: string, clientId: string) {
    const list = clients.get(executionId);
    if (!list) return;
    const idx = list.findIndex(c => c.id === clientId);
    if (idx !== -1) list.splice(idx, 1);
    if (list.length === 0) clients.delete(executionId);
  },

  emit(executionId: string, event: string, data: unknown) {
    const list = clients.get(executionId);
    if (!list) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of list) {
      try {
        client.res.write(payload);
      } catch {
        // client disconnected
      }
    }
  },

  emitAll(event: string, data: unknown) {
    for (const [executionId] of clients) {
      this.emit(executionId, event, data);
    }
  },
};
