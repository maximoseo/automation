import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Play, Save, Upload, Download, CheckCircle, AlertCircle, Loader2
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
      <div className="h-12 border-b bg-card flex items-center px-3 gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Input
          value={workflowName}
          onChange={e => setWorkflowName(e.target.value)}
          className="h-8 w-64 text-sm font-medium border-none bg-transparent hover:bg-accent focus:bg-accent"
        />

        {isDirty && <Badge variant="warning" className="text-[10px]">Unsaved</Badge>}

        <div className="flex-1" />

        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="h-3.5 w-3.5 mr-1" />
          Import
        </Button>

        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-3.5 w-3.5 mr-1" />
          Export
        </Button>

        <Button variant="outline" size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
          Save
        </Button>

        <Button size="sm" onClick={onRun} disabled={executionStatus === 'running'}>
          {executionStatus === 'running' ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5 mr-1" />
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
