import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Zap, LayoutDashboard, History, Settings, Plus, LogOut, Menu, X } from 'lucide-react';
import { Button } from '../ui/button';
import { cn, apiFetch } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useState, useEffect } from 'react';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="p-5 flex items-center gap-3 border-b border-border/50">
        <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight">Automation</span>
          <span className="block text-xs text-muted-foreground">Workflow Builder</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer',
              location.pathname === item.path
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-3 space-y-3 border-t border-border/50">
        <Button onClick={handleNew} disabled={creating} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-muted/50">
          <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
            {user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <span className="text-xs text-muted-foreground truncate flex-1" title={user?.email || ''}>
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-destructive/10 cursor-pointer"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - desktop: always visible, mobile: slide-in drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r border-border/50 bg-card flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile close button */}
        <button
          className="absolute top-4 right-3 lg:hidden p-1 rounded-md hover:bg-accent cursor-pointer"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card">
          <button
            className="p-1.5 rounded-lg hover:bg-accent cursor-pointer"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">Automation</span>
          </div>
        </div>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
