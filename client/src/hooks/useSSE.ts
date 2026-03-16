import { useEffect, useRef } from 'react';
import { useExecutionStore } from '@/stores/executionStore';

export function useSSE(executionId: string | null) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const { setNodeState, completeExecution } = useExecutionStore();

  useEffect(() => {
    if (!executionId) return;

    const es = new EventSource(`/api/executions/${executionId}/stream`);
    eventSourceRef.current = es;

    es.addEventListener('node:start', (e) => {
      const data = JSON.parse(e.data);
      setNodeState(data.nodeName, {
        nodeName: data.nodeName,
        nodeType: data.nodeType,
        status: 'running',
      });
    });

    es.addEventListener('node:complete', (e) => {
      const data = JSON.parse(e.data);
      setNodeState(data.nodeName, {
        nodeName: data.nodeName,
        nodeType: data.nodeType,
        status: 'success',
        output: data.output,
        executionTimeMs: data.executionTimeMs,
      });
    });

    es.addEventListener('node:error', (e) => {
      const data = JSON.parse(e.data);
      setNodeState(data.nodeName, {
        nodeName: data.nodeName,
        nodeType: data.nodeType,
        status: 'error',
        error: data.error,
        executionTimeMs: data.executionTimeMs,
      });
    });

    es.addEventListener('execution:complete', (e) => {
      const data = JSON.parse(e.data);
      completeExecution('success');
      es.close();
    });

    es.addEventListener('execution:error', (e) => {
      const data = JSON.parse(e.data);
      completeExecution('error', data.error);
      es.close();
    });

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [executionId, setNodeState, completeExecution]);
}
