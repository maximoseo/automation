import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Play, Copy, Trash2, Search, Workflow } from 'lucide-react';
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
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground text-sm mt-1">Build and manage your automation workflows</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button size="sm" onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Workflow grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(wf => (
            <Card
              key={wf.id}
              className="hover:border-primary/40 hover:shadow-glow cursor-pointer group"
              onClick={() => navigate(`/workflow/${wf.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-semibold">{wf.name}</CardTitle>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer"
                      onClick={() => executeMutation.mutate(wf.id)} title="Run">
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer"
                      onClick={() => duplicateMutation.mutate(wf.id)} title="Duplicate">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm('Delete this workflow?')) deleteMutation.mutate(wf.id);
                      }} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="line-clamp-2 text-xs">{wf.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">{wf.node_count} nodes</Badge>
                  {wf.has_unsupported_nodes && <Badge variant="warning" className="text-xs">Partial</Badge>}
                  {statusBadge(wf.last_execution_status)}
                  <span className="ml-auto text-xs">{formatDate(wf.updated_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-16">
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Workflow className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-base font-medium text-foreground">No workflows yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create a new workflow or import an existing n8n workflow</p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button size="sm" onClick={handleNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workflow
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import n8n Workflow</DialogTitle>
            <DialogDescription>Paste n8n workflow JSON or upload a file</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="flex items-center justify-center w-full h-10 rounded-lg border-2 border-dashed border-input hover:border-primary/40 transition-colors cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                <Upload className="h-4 w-4 mr-2" />
                Choose a JSON file
                <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
              </label>
            </div>
            <Textarea
              placeholder="Or paste n8n workflow JSON here..."
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
