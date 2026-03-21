import { useState } from 'react';
import { NODE_TYPE_CONFIGS } from '@shared/node';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Code, Globe, GitBranch, ArrowLeftRight, Merge, Layers, MinusCircle,
  Webhook, Reply, Clock, Mail, Table, HardDrive, FileText, MessageSquare,
  Twitter, Box
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Code, Globe, GitBranch, ArrowLeftRight, Merge, Layers, MinusCircle,
  Webhook, Reply, Clock, Mail, Table, HardDrive, FileText, MessageSquare,
  Twitter, Box,
};

const CATEGORIES = [
  { key: 'trigger', label: 'Triggers' },
  { key: 'logic', label: 'Logic' },
  { key: 'action', label: 'Actions' },
  { key: 'integration', label: 'Integrations' },
] as const;

interface NodePaletteProps {
  onAddNode: (type: string) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const allNodes = Object.values(NODE_TYPE_CONFIGS);
  const filtered = allNodes.filter(
    n => n.displayName.toLowerCase().includes(search.toLowerCase()) ||
         n.type.toLowerCase().includes(search.toLowerCase())
  );

  const supportBadge = (level: string) => {
    const variants: Record<string, 'success' | 'warning' | 'destructive'> = {
      full: 'success',
      partial: 'warning',
      unsupported: 'destructive',
    };
    return <Badge variant={variants[level] || 'secondary'} className="text-xs px-1.5 py-0">{level}</Badge>;
  };

  if (collapsed) {
    return (
      <div className="w-10 border-r border-border/50 bg-card flex flex-col items-center py-2">
        <button
          className="p-1.5 rounded-md hover:bg-accent transition-colors cursor-pointer"
          onClick={() => setCollapsed(false)}
          title="Expand palette"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-60 border-r border-border/50 bg-card flex flex-col h-full">
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nodes</h3>
          <button
            className="p-1 rounded-md hover:bg-accent transition-colors cursor-pointer"
            onClick={() => setCollapsed(true)}
            title="Collapse palette"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {CATEGORIES.map(cat => {
            const nodes = filtered.filter(n => n.category === cat.key);
            if (nodes.length === 0) return null;
            return (
              <div key={cat.key}>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1.5">
                  {cat.label}
                </div>
                <div className="space-y-0.5">
                  {nodes.map(node => {
                    const Icon = ICON_MAP[node.icon] || Box;
                    return (
                      <button
                        key={node.type}
                        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left hover:bg-accent transition-all duration-200 group cursor-pointer"
                        onClick={() => onAddNode(node.type)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/reactflow', node.type);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                      >
                        <div className="p-1.5 rounded-md" style={{ backgroundColor: `${node.color}15` }}>
                          <Icon className="h-3.5 w-3.5" style={{ color: node.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{node.displayName}</div>
                        </div>
                        {supportBadge(node.supportLevel)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
