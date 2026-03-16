import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, MoreVertical, Play, Copy, Trash2, FileDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useWorkflows, useDeleteWorkflow, useDuplicateWorkflow, useImportWorkflow, useExecuteWorkflow } from '@/hooks/useWorkflows';
import { apiFetch, formatDate } from '@/lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: workflows, isLoading } = useWorkflows();
  const deleteMutation = useDeleteWorkflow();
  const duplicateMutation = useDuplicateWorkflow();
  const importMutation = useImportWorkflow();
  const executeMutation = useExecuteWorkflow();
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importJson, setImportJson] = useState('');

  const filtered = workflows?.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleNew() {
    const res = await apiFetch<{ data: { id: string } }>('/workflows', {
      method: 'POST',
      body: JSON.stringify({ name: 'Untitled Workflow', description: '' }),
    });
    navigate(`/workflow/${res.data.id}`);
  }

  async function handleImport() {
    try {
      const json = JSON.parse(importJson);
      const result = await importMutation.mutateAsync(json);
      setImportOpen(false);
      setImportJson('');
      navigate(`/workflow/${result.data.workflow_id}`);
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`);
    }
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportJson(ev.target?.result as string || '');
    };
    reader.readAsText(file);
  }

  const statusBadge = (status?: string) => {
    if (!status) return null;
    const variant = status === 'success' ? 'success' : status === 'error' ? 'destructive' : status === 'running' ? 'info' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground mt-1">Build and manage your automation workflows</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(wf => (
            <Card key={wf.id} className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => navigate(`/workflow/${wf.id}`)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{wf.name}</CardTitle>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => executeMutation.mutate(wf.id)}>
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => duplicateMutation.mutate(wf.id)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => {
                        if (confirm('Delete this workflow?')) deleteMutation.mutate(wf.id);
                      }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="line-clamp-2">{wf.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{wf.node_count} nodes</Badge>
                  {wf.has_unsupported_nodes && <Badge variant="warning">Partial</Badge>}
                  {statusBadge(wf.last_execution_status)}
                  <span className="ml-auto">{formatDate(wf.updated_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-muted-foreground mb-4">
              <p className="text-lg font-medium">No workflows yet</p>
              <p className="text-sm mt-1">Create a new workflow or import an existing n8n workflow JSON</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import n8n Workflow</DialogTitle>
            <DialogDescription>Paste n8n workflow JSON or upload a file</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input type="file" accept=".json" onChange={handleFileImport} />
            </div>
            <Textarea
              placeholder="Paste n8n workflow JSON here..."
              value={importJson}
              onChange={e => setImportJson(e.target.value)}
              rows={12}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!importJson.trim()}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
