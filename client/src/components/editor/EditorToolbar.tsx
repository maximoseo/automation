import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Play, Save, Upload, Download, Loader2, Zap
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useExecutionStore } from '@/stores/executionStore';

interface EditorToolbarProps {
  onSave: () => void;
  onRun: () => void;
  onImport: (json: any) => void;
  onExport: () => void;
  saving: boolean;
}

export function EditorToolbar({ onSave, onRun, onImport, onExport, saving }: EditorToolbarProps) {
  const navigate = useNavigate();
  const { workflowName, setWorkflowName, isDirty } = useEditorStore();
  const { executionStatus } = useExecutionStore();
  const [importOpen, setImportOpen] = useState(false);
  const [importJson, setImportJson] = useState('');

  function handleImport() {
    try {
      const json = JSON.parse(importJson);
      onImport(json);
      setImportOpen(false);
      setImportJson('');
    } catch (err) {
      alert(`Invalid JSON: ${(err as Error).message}`);
    }
  }

  return (
    <>
      <div className="h-14 border-b border-border/50 bg-card flex items-center px-3 gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 cursor-pointer" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="hidden sm:flex items-center gap-2 mr-2">
          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
        </div>

        <Input
          value={workflowName}
          onChange={e => setWorkflowName(e.target.value)}
          className="h-8 w-48 sm:w-64 text-sm font-medium border-none bg-transparent hover:bg-accent focus:bg-accent rounded-lg"
        />

        {isDirty && <Badge variant="warning" className="text-xs shrink-0">Unsaved</Badge>}

        <div className="flex-1" />

        <div className="hidden sm:flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)} className="cursor-pointer">
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Import
          </Button>

          <Button variant="ghost" size="sm" onClick={onExport} className="cursor-pointer">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
        </div>

        <div className="h-5 w-px bg-border hidden sm:block" />

        <Button variant="outline" size="sm" onClick={onSave} disabled={saving} className="cursor-pointer">
          {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Save
        </Button>

        <Button size="sm" onClick={onRun} disabled={executionStatus === 'running'} className="cursor-pointer shadow-sm">
          {executionStatus === 'running' ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5 mr-1.5" />
          )}
          Run
        </Button>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import n8n Workflow</DialogTitle>
            <DialogDescription>This will replace the current workflow</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Paste n8n workflow JSON here..."
            value={importJson}
            onChange={e => setImportJson(e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!importJson.trim()}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
