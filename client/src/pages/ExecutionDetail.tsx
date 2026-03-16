import { useParams, Link } from 'react-router-dom';
import { useExecution } from '@/hooks/useExecutions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate, formatDuration } from '@/lib/utils';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function ExecutionDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: execution, isLoading } = useExecution(id);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Execution not found
      </div>
    );
  }

  const nodeExecs = execution.node_executions || [];
  const selectedNodeExec = nodeExecs.find(ne => ne.node_name === selectedNode);

  const statusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'destructive' | 'info' | 'secondary'> = {
      success: 'success', error: 'destructive', running: 'info', pending: 'secondary',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/executions">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Execution Detail</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>{(execution as any).workflow_name || 'Workflow'}</span>
            <span>-</span>
            <span>{formatDate(execution.started_at || execution.created_at)}</span>
            {statusBadge(execution.status)}
          </div>
        </div>
      </div>

      {execution.error && (
        <Card className="mb-4 border-red-500/50">
          <CardContent className="p-4">
            <p className="text-sm text-red-400">{execution.error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Node list */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Nodes ({nodeExecs.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {nodeExecs.map(ne => {
                  const StatusIcon = ne.status === 'success' ? CheckCircle2 : ne.status === 'error' ? XCircle : ne.status === 'running' ? Loader2 : Clock;
                  const iconColor = ne.status === 'success' ? 'text-green-400' : ne.status === 'error' ? 'text-red-400' : ne.status === 'running' ? 'text-blue-400 animate-spin' : 'text-muted-foreground';

                  return (
                    <button
                      key={ne.id}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-accent transition-colors border-b ${selectedNode === ne.node_name ? 'bg-accent' : ''}`}
                      onClick={() => setSelectedNode(ne.node_name)}
                    >
                      <StatusIcon className={`h-4 w-4 ${iconColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{ne.node_name}</div>
                        <div className="text-xs text-muted-foreground">{ne.node_type.split('.').pop()}</div>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDuration(ne.execution_time_ms)}</span>
                    </button>
                  );
                })}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Node detail */}
        <div className="lg:col-span-2">
          {selectedNodeExec ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{selectedNodeExec.node_name}</CardTitle>
                  {statusBadge(selectedNodeExec.status)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedNodeExec.node_type} - {formatDuration(selectedNodeExec.execution_time_ms)}
                </div>
              </CardHeader>
              <CardContent>
                {selectedNodeExec.error && (
                  <div className="mb-4 p-3 rounded-md bg-red-500/10 text-red-400 text-sm">
                    {selectedNodeExec.error}
                  </div>
                )}

                <Tabs defaultValue="output">
                  <TabsList>
                    <TabsTrigger value="output">Output</TabsTrigger>
                    <TabsTrigger value="input">Input</TabsTrigger>
                  </TabsList>
                  <TabsContent value="output">
                    <ScrollArea className="h-[350px]">
                      <pre className="text-xs font-mono p-3 bg-background rounded-md">
                        {selectedNodeExec.output_data
                          ? JSON.stringify(selectedNodeExec.output_data, null, 2)
                          : 'No output data'}
                      </pre>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="input">
                    <ScrollArea className="h-[350px]">
                      <pre className="text-xs font-mono p-3 bg-background rounded-md">
                        {selectedNodeExec.input_data
                          ? JSON.stringify(selectedNodeExec.input_data, null, 2)
                          : 'No input data'}
                      </pre>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-[500px]">
              <CardContent>
                <p className="text-muted-foreground">Select a node to view its execution details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
