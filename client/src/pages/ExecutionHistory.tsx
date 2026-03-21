import { Link } from 'react-router-dom';
import { useExecutions } from '@/hooks/useExecutions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate, formatDuration } from '@/lib/utils';
import { Clock, CheckCircle2, XCircle, Loader2, ChevronRight, History } from 'lucide-react';

const statusConfig: Record<string, { icon: React.ElementType; variant: 'success' | 'destructive' | 'info' | 'secondary'; label: string }> = {
  success: { icon: CheckCircle2, variant: 'success', label: 'Success' },
  error: { icon: XCircle, variant: 'destructive', label: 'Error' },
  running: { icon: Loader2, variant: 'info', label: 'Running' },
  pending: { icon: Clock, variant: 'secondary', label: 'Pending' },
  cancelled: { icon: XCircle, variant: 'secondary', label: 'Cancelled' },
};

export default function ExecutionHistory() {
  const { data: executions, isLoading } = useExecutions();

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Execution History</h1>
        <p className="text-muted-foreground text-sm mt-1">View past workflow executions and their results</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-5 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : executions && executions.length > 0 ? (
        <div className="space-y-2">
          {executions.map(exec => {
            const config = statusConfig[exec.status] || statusConfig.pending;
            const StatusIcon = config.icon;
            const duration = exec.started_at && exec.finished_at
              ? new Date(exec.finished_at).getTime() - new Date(exec.started_at).getTime()
              : null;

            return (
              <Link key={exec.id} to={`/executions/${exec.id}`}>
                <Card className="hover:border-primary/40 hover:shadow-glow transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      config.variant === 'success' ? 'bg-emerald-500/10' :
                      config.variant === 'destructive' ? 'bg-red-500/10' :
                      config.variant === 'info' ? 'bg-indigo-500/10' : 'bg-muted'
                    }`}>
                      <StatusIcon className={`h-4 w-4 ${
                        exec.status === 'running' ? 'animate-spin text-indigo-400' :
                        config.variant === 'success' ? 'text-emerald-400' :
                        config.variant === 'destructive' ? 'text-red-400' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{(exec as any).workflow_name || 'Unknown Workflow'}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{formatDate(exec.started_at || exec.created_at)}</span>
                        {exec.error && <span className="text-red-400 truncate max-w-[200px]">{exec.error}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={config.variant}>{config.label}</Badge>
                      <Badge variant="secondary">{exec.trigger_type}</Badge>
                      {duration !== null && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDuration(duration)}</span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-16">
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <History className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-base font-medium text-foreground">No executions yet</p>
                <p className="text-sm text-muted-foreground mt-1">Run a workflow to see results here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
