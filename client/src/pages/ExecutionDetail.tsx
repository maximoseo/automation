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
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="p-8 text-center text-muted-foreground">
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
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/executions">
          <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight">Execution Detail</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground">{(execution as any).workflow_name || 'Workflow'}</span>
            <span className="text-muted-foreground/40">|</span>
            <span>{formatDate(execution.started_at || execution.created_at)}</span>
            {statusBadge(execution.status)}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {execution.error && (
        <Card className="mb-4 border-red-500/30 bg-red-500/5">
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
              <CardTitle className="text-sm">Nodes ({nodeExecs.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {nodeExecs.map(ne => {
                  const StatusIcon = ne.status === 'success' ? CheckCircle2 : ne.status === 'error' ? XCircle : ne.status === 'running' ? Loader2 : Clock;
                  const iconColor = ne.status === 'success' ? 'text-emerald-400' : ne.status === 'error' ? 'text-red-400' : ne.status === 'running' ? 'text-indigo-400 animate-spin' : 'text-muted-foreground';
                  const isSelected = selectedNode === ne.node_name;

                  return (
                    <button
                      key={ne.id}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-all duration-200 border-b border-border/50 cursor-pointer ${
                        isSelected ? 'bg-accent border-l-2 border-l-primary' : ''
                      }`}
                      onClick={() => setSelectedNode(ne.node_name)}
                    >
                      <StatusIcon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{ne.node_name}</div>
                        <div className="text-xs text-muted-foreground">{ne.node_type.split('.').pop()}</div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDuration(ne.execution_time_ms)}</span>
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
                  <CardTitle className="text-sm">{selectedNodeExec.node_name}</CardTitle>
                  {statusBadge(selectedNodeExec.status)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedNodeExec.node_type} &middot; {formatDuration(selectedNodeExec.execution_time_ms)}
                </div>
              </CardHeader>
              <CardContent>
                {selectedNodeExec.error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm border border-red-500/20">
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
                      <pre className="text-xs font-mono p-4 bg-background rounded-lg border border-border/50">
                        {selectedNodeExec.output_data
                          ? JSON.stringify(selectedNodeExec.output_data, null, 2)
                          : 'No output data'}
                      </pre>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="input">
                    <ScrollArea className="h-[350px]">
                      <pre className="text-xs font-mono p-4 bg-background rounded-lg border border-border/50">
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
              <CardContent className="text-center">
                <p className="text-muted-foreground text-sm">Select a node to view its execution details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
