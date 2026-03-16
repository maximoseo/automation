import { useState } from 'react';
import { NODE_TYPE_CONFIGS } from '@shared/node';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
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
    return <Badge variant={variants[level] || 'secondary'} className="text-[9px] px-1 py-0">{level}</Badge>;
  };

  return (
    <div className="w-64 border-r bg-card flex flex-col h-full">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm mb-2">Node Palette</h3>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
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
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
                  {cat.label}
                </div>
                <div className="space-y-0.5">
                  {nodes.map(node => {
                    const Icon = ICON_MAP[node.icon] || Box;
                    return (
                      <button
                        key={node.type}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-accent transition-colors group"
                        onClick={() => onAddNode(node.type)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/reactflow', node.type);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                      >
                        <div className="p-1 rounded" style={{ backgroundColor: `${node.color}20` }}>
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
