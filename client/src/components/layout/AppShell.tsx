import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Zap, LayoutDashboard, History, Settings, Plus, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { cn, apiFetch } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

const NAV_ITEMS = [
  { path: '/', label: 'Workflows', icon: LayoutDashboard },
  { path: '/executions', label: 'Executions', icon: History },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [creating, setCreating] = useState(false);

  async function handleNew() {
    setCreating(true);
    try {
      const res = await apiFetch<{ data: { id: string } }>('/workflows', {
        method: 'POST',
        body: JSON.stringify({ name: 'Untitled Workflow', description: '' }),
      });
      navigate(`/workflow/${res.data.id}`);
    } catch (err) {
      console.error('Failed to create workflow:', err);
    } finally {
      setCreating(false);
    }
  }

  async function handleLogout() {
    await signOut();
    navigate('/auth/login', { replace: true });
  }

  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 flex items-center gap-2 border-b">
          <Zap className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">Automation</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                location.pathname === item.path
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 space-y-2 border-t">
          <Button onClick={handleNew} disabled={creating} className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
          <div className="flex items-center justify-between px-1 py-1">
            <span className="text-xs text-muted-foreground truncate max-w-[160px]" title={user?.email || ''}>
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
