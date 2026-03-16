import { useExecutionStore } from '@/stores/executionStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { useState } from 'react';

export function ExecutionPanel() {
  const { executionStatus, nodeStates, isExecutionPanelOpen, toggleExecutionPanel } = useExecutionStore();
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  if (!isExecutionPanelOpen) {
    return (
      <div className="border-t bg-card">
        <button
          className="w-full flex items-center justify-between px-4 py-2 text-xs hover:bg-accent transition-colors"
          onClick={toggleExecutionPanel}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">Execution Log</span>
            {executionStatus === 'running' && <Badge variant="info">Running</Badge>}
            {executionStatus === 'success' && <Badge variant="success">Complete</Badge>}
            {executionStatus === 'error' && <Badge variant="destructive">Error</Badge>}
            {nodeStates.size > 0 && <span className="text-muted-foreground">{nodeStates.size} nodes</span>}
          </div>
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const sortedNodes = Array.from(nodeStates.values());

  const statusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />;
      case 'success': return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />;
      case 'error': return <XCircle className="h-3.5 w-3.5 text-red-400" />;
      default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="border-t bg-card" style={{ height: 250 }}>
      <button
        className="w-full flex items-center justify-between px-4 py-2 text-xs border-b hover:bg-accent transition-colors"
        onClick={toggleExecutionPanel}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">Execution Log</span>
          {executionStatus === 'running' && <Badge variant="info">Running</Badge>}
          {executionStatus === 'success' && <Badge variant="success">Complete</Badge>}
          {executionStatus === 'error' && <Badge variant="destructive">Error</Badge>}
        </div>
        <ChevronDown className="h-4 w-4" />
      </button>
      <ScrollArea className="h-[210px]">
        <div className="p-2 space-y-1">
          {sortedNodes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No execution data yet. Run the workflow to see results.</p>
          ) : (
            sortedNodes.map(nodeState => (
              <div key={nodeState.nodeName} className="rounded-md border">
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-accent/50 transition-colors"
                  onClick={() => setExpandedNode(expandedNode === nodeState.nodeName ? null : nodeState.nodeName)}
                >
                  {statusIcon(nodeState.status)}
                  <span className="text-xs font-medium flex-1">{nodeState.nodeName}</span>
                  <span className="text-[10px] text-muted-foreground">{nodeState.nodeType.split('.').pop()}</span>
                  {nodeState.executionTimeMs !== undefined && (
                    <span className="text-[10px] text-muted-foreground">{formatDuration(nodeState.executionTimeMs)}</span>
                  )}
                </button>
                {expandedNode === nodeState.nodeName && (
                  <div className="px-3 py-2 border-t text-xs">
                    {nodeState.error && <div className="text-red-400 mb-1">{nodeState.error}</div>}
                    {nodeState.output !== undefined && nodeState.output !== null && (
                      <pre className="bg-background rounded p-2 overflow-auto max-h-32 text-[10px]">
                        {JSON.stringify(nodeState.output, null, 2)}
                      </pre>
                    )}
                    {!nodeState.error && !nodeState.output && nodeState.status === 'running' && (
                      <span className="text-muted-foreground">Executing...</span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
