import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useEditorStore } from '@/stores/editorStore';
import { useExecutionStore } from '@/stores/executionStore';
import {
  Code, Globe, GitBranch, ArrowLeftRight, Merge, Layers, MinusCircle,
  Webhook, Reply, Clock, Mail, Table, HardDrive, FileText, MessageSquare,
  Twitter, Box, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  Code, Globe, GitBranch, ArrowLeftRight, Merge, Layers, MinusCircle,
  Webhook, Reply, Clock, Mail, Table, HardDrive, FileText, MessageSquare,
  Twitter, Box, Zap,
};

function WorkflowNodeComponent({ id, data, selected }: NodeProps) {
  const selectNode = useEditorStore(s => s.selectNode);
  const nodeStates = useExecutionStore(s => s.nodeStates);

  const label = (data.label as string) || 'Node';
  const displayName = (data.displayName as string) || label;
  const color = (data.color as string) || '#6b7280';
  const iconName = (data.icon as string) || 'Box';
  const supportLevel = (data.supportLevel as string) || 'full';
  const inputs = (data.inputs as number) ?? 1;
  const outputs = (data.outputs as number) ?? 1;
  const disabled = data.disabled as boolean;

  const Icon = ICON_MAP[iconName] || Box;
  const nodeState = nodeStates.get(label);

  const statusColors: Record<string, string> = {
    running: 'ring-2 ring-indigo-500/60 animate-pulse',
    success: 'ring-2 ring-emerald-500/60',
    error: 'ring-2 ring-red-500/60',
  };

  const supportBadgeColors: Record<string, string> = {
    full: 'bg-emerald-500',
    partial: 'bg-amber-500',
    'import-only': 'bg-orange-500',
    unsupported: 'bg-red-500',
  };

  return (
    <div
      className={cn(
        'relative bg-card border-2 rounded-xl shadow-md min-w-[180px] transition-all duration-200',
        selected ? 'border-primary shadow-lg shadow-primary/20' : 'border-border/60 hover:border-border',
        disabled && 'opacity-50',
        nodeState && statusColors[nodeState.status],
      )}
      onClick={() => selectNode(id)}
    >
      {/* Support level indicator */}
      <div className={cn('absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-card', supportBadgeColors[supportLevel])} />

      {/* Input handles */}
      {inputs > 0 && Array.from({ length: inputs }).map((_, i) => (
        <Handle
          key={`input_${i}`}
          type="target"
          position={Position.Left}
          id={`input_${i}`}
          style={{
            top: inputs === 1 ? '50%' : `${((i + 1) / (inputs + 1)) * 100}%`,
            background: color,
            width: 10,
            height: 10,
            border: '2px solid hsl(var(--card))',
          }}
        />
      ))}

      {/* Node header */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-t-[10px]"
        style={{ backgroundColor: `${color}12` }}
      >
        <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">{label}</div>
          <div className="text-xs text-muted-foreground truncate">{displayName}</div>
        </div>
      </div>

      {/* Node body with execution state */}
      {nodeState && (
        <div className="px-3 py-2 text-xs border-t border-border/30">
          {nodeState.status === 'success' && (
            <span className="text-emerald-400 font-medium">{nodeState.executionTimeMs}ms</span>
          )}
          {nodeState.status === 'error' && (
            <span className="text-red-400 truncate block">{nodeState.error}</span>
          )}
          {nodeState.status === 'running' && (
            <span className="text-indigo-400">Running...</span>
          )}
        </div>
      )}

      {/* Output handles */}
      {outputs > 0 && Array.from({ length: outputs }).map((_, i) => (
        <Handle
          key={`output_${i}`}
          type="source"
          position={Position.Right}
          id={`output_${i}`}
          style={{
            top: outputs === 1 ? '50%' : `${((i + 1) / (outputs + 1)) * 100}%`,
            background: color,
            width: 10,
            height: 10,
            border: '2px solid hsl(var(--card))',
          }}
        />
      ))}
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);
