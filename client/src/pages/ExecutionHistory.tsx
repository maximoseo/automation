import { Link } from 'react-router-dom';
import { useExecutions } from '@/hooks/useExecutions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatDuration } from '@/lib/utils';
import { Clock, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';

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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Execution History</h1>
        <p className="text-muted-foreground mt-1">View past workflow executions and their results</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
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
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    <StatusIcon className={`h-5 w-5 ${exec.status === 'running' ? 'animate-spin text-blue-400' : config.variant === 'success' ? 'text-green-400' : config.variant === 'destructive' ? 'text-red-400' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{(exec as any).workflow_name || 'Unknown Workflow'}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(exec.started_at || exec.created_at)}
                        {exec.error && <span className="text-red-400 ml-2 truncate">{exec.error}</span>}
                      </div>
                    </div>
                    <Badge variant={config.variant}>{config.label}</Badge>
                    <Badge variant="secondary">{exec.trigger_type}</Badge>
                    {duration !== null && (
                      <span className="text-xs text-muted-foreground">{formatDuration(duration)}</span>
                    )}
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">No executions yet. Run a workflow to see results here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
