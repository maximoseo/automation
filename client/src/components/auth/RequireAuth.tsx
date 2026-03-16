import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Zap } from 'lucide-react';

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show a loading screen while checking auth — prevents content flicker
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary animate-pulse" />
            <span className="text-xl font-bold text-foreground">Automation</span>
          </div>
          <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-primary/60" />
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect to login, preserving intended destination
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
