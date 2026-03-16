import React from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { NODE_TYPE_CONFIGS } from '@shared/node';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function InspectorPanel() {
  const { nodes, selectedNodeId, updateNodeData, deleteNode, selectNode } = useEditorStore();
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="w-80 border-l bg-card flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
        Select a node to inspect its properties
      </div>
    );
  }

  const config = NODE_TYPE_CONFIGS[selectedNode.data.nodeType as string];
  const params = (selectedNode.data.parameters || {}) as Record<string, unknown>;

  function handleParamChange(key: string, value: unknown) {
    updateNodeData(selectedNode!.id, {
      parameters: { ...params, [key]: value },
    });
  }

  function handleLabelChange(label: string) {
    updateNodeData(selectedNode!.id, { label });
  }

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Inspector</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteNode(selectedNode.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => selectNode(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="params" className="flex-1 flex flex-col">
        <TabsList className="mx-3 mt-2">
          <TabsTrigger value="params" className="text-xs">Parameters</TabsTrigger>
          <TabsTrigger value="json" className="text-xs">JSON</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="params" className="p-3 space-y-4 mt-0">
            {/* Node info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={
                  config?.supportLevel === 'full' ? 'success' :
                  config?.supportLevel === 'partial' ? 'warning' : 'destructive'
                }>
                  {config?.supportLevel || 'unknown'}
                </Badge>
                <span className="text-xs text-muted-foreground">{config?.displayName || selectedNode.data.nodeType as string}</span>
              </div>
            </div>

            {/* Node name */}
            <div className="space-y-1">
              <Label className="text-xs">Node Name</Label>
              <Input
                value={(selectedNode.data.label as string) || ''}
                onChange={e => handleLabelChange(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* Parameters */}
            {renderParameters(params, config?.type || '', handleParamChange)}
          </TabsContent>

          <TabsContent value="json" className="p-3 mt-0">
            <JsonEditor
              value={params}
              onChange={(newParams) => {
                updateNodeData(selectedNode.id, { parameters: newParams });
              }}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function renderParameters(
  params: Record<string, unknown>,
  nodeType: string,
  onChange: (key: string, value: unknown) => void
) {
  const fields: React.ReactElement[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith('_')) continue;

    if (typeof value === 'string') {
      const isLong = value.length > 100 || key === 'jsCode' || key === 'text' || key === 'body' || key === 'responseBody';
      fields.push(
        <div key={key} className="space-y-1">
          <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
          {isLong ? (
            <Textarea
              value={value}
              onChange={e => onChange(key, e.target.value)}
              className="text-xs font-mono min-h-[100px]"
              rows={6}
            />
          ) : (
            <Input
              value={value}
              onChange={e => onChange(key, e.target.value)}
              className="h-8 text-xs"
            />
          )}
        </div>
      );
    } else if (typeof value === 'number') {
      fields.push(
        <div key={key} className="space-y-1">
          <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
          <Input
            type="number"
            value={value}
            onChange={e => onChange(key, parseFloat(e.target.value) || 0)}
            className="h-8 text-xs"
          />
        </div>
      );
    } else if (typeof value === 'boolean') {
      fields.push(
        <div key={key} className="flex items-center justify-between">
          <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
          <input
            type="checkbox"
            checked={value}
            onChange={e => onChange(key, e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
        </div>
      );
    } else if (typeof value === 'object' && value !== null) {
      fields.push(
        <div key={key} className="space-y-1">
          <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
          <Textarea
            value={JSON.stringify(value, null, 2)}
            onChange={e => {
              try { onChange(key, JSON.parse(e.target.value)); } catch { /* ignore invalid json */ }
            }}
            className="text-xs font-mono min-h-[60px]"
            rows={4}
          />
        </div>
      );
    }
  }

  if (fields.length === 0) {
    return <p className="text-xs text-muted-foreground">No editable parameters</p>;
  }

  return <>{fields}</>;
}

function JsonEditor({ value, onChange }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
  }, [value]);

  function handleChange(newText: string) {
    setText(newText);
    try {
      const parsed = JSON.parse(newText);
      setError(null);
      onChange(parsed);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={e => handleChange(e.target.value)}
        className="text-xs font-mono min-h-[200px]"
        rows={15}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
