import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiFetch } from '@/lib/utils';
import { CREDENTIAL_TYPE_CONFIGS } from '@shared/credential';
import { Plus, Trash2, Key, Shield, Zap } from 'lucide-react';

interface Credential {
  id: string;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
}

export default function Settings() {
  const qc = useQueryClient();
  const { data: credentials } = useQuery({
    queryKey: ['credentials'],
    queryFn: () => apiFetch<{ data: Credential[] }>('/credentials').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/credentials/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credentials'] }),
  });

  const [addOpen, setAddOpen] = useState(false);
  const [newCred, setNewCred] = useState({ name: '', type: 'smtp', data: {} as Record<string, string> });

  const createMutation = useMutation({
    mutationFn: (cred: { name: string; type: string; data: Record<string, string> }) =>
      apiFetch('/credentials', { method: 'POST', body: JSON.stringify(cred) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credentials'] });
      setAddOpen(false);
      setNewCred({ name: '', type: 'smtp', data: {} });
    },
  });

  const typeConfig = CREDENTIAL_TYPE_CONFIGS[newCred.type];

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage credentials and app configuration</p>
      </div>

      <Tabs defaultValue="credentials">
        <TabsList>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Credentials are encrypted with AES-256-GCM and stored securely.
            </p>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Credential
            </Button>
          </div>

          {credentials && credentials.length > 0 ? (
            <div className="space-y-2">
              {credentials.map(cred => (
                <Card key={cred.id} className="hover:border-primary/30 transition-all">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Key className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{cred.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {CREDENTIAL_TYPE_CONFIGS[cred.type]?.displayName || cred.type}
                      </div>
                    </div>
                    <Badge variant="secondary">{cred.type}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm('Delete this credential?')) deleteMutation.mutate(cred.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <div className="flex flex-col items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Shield className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">No credentials yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Add credentials to enable integrations like email, Slack, and Google services</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="about">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Automation Workflow Builder</CardTitle>
                  <CardDescription>n8n-compatible workflow builder and executor</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Version</span>
                <Badge variant="secondary">1.0.0</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Supported Node Types</span>
                <Badge variant="secondary">17</Badge>
              </div>
              <div className="py-2 border-b border-border/50">
                <span className="text-muted-foreground text-xs block mb-2">Fully Executable</span>
                <div className="flex flex-wrap gap-1.5">
                  {['code', 'httpRequest', 'if', 'switch', 'merge', 'splitInBatches', 'noOp', 'webhook', 'respondToWebhook', 'scheduleTrigger'].map(n => (
                    <Badge key={n} variant="success" className="text-xs">{n}</Badge>
                  ))}
                </div>
              </div>
              <div className="py-2">
                <span className="text-muted-foreground text-xs block mb-2">Partial (needs credentials)</span>
                <div className="flex flex-wrap gap-1.5">
                  {['emailSend', 'googleSheets', 'googleDrive', 'googleDriveTrigger', 'googleDocs', 'slack', 'twitter'].map(n => (
                    <Badge key={n} variant="warning" className="text-xs">{n}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Credential Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credential</DialogTitle>
            <DialogDescription>Credentials are encrypted before storage</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newCred.name}
                onChange={e => setNewCred({ ...newCred, name: e.target.value })}
                placeholder="My SMTP Server"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="relative">
                <select
                  value={newCred.type}
                  onChange={e => setNewCred({ ...newCred, type: e.target.value, data: {} })}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none cursor-pointer"
                >
                  {Object.entries(CREDENTIAL_TYPE_CONFIGS).map(([key, config]) => (
                    <option key={key} value={key}>{config.displayName}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
            {typeConfig?.fields.map(field => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}</Label>
                <Input
                  type={field.type === 'password' ? 'password' : 'text'}
                  value={newCred.data[field.key] || ''}
                  onChange={e => setNewCred({
                    ...newCred,
                    data: { ...newCred.data, [field.key]: e.target.value },
                  })}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(newCred)}
              disabled={!newCred.name || createMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
