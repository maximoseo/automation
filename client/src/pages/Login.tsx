import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
  const { user, loading, signIn } = useAuth();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already authenticated — redirect to intended page
  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  // Still loading initial auth check
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Zap className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await signIn(email.trim(), password);
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    }
    // On success, the auth state change will trigger a redirect via the Navigate above
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center bg-gradient-to-br from-primary/10 via-background to-primary/5 px-12">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Zap className="h-12 w-12 text-primary" />
            <span className="text-4xl font-bold text-foreground">Automation</span>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Build, test, and deploy powerful workflows with an n8n-compatible visual editor.
            Connect APIs, transform data, and automate your processes.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">17+</div>
              <div className="text-xs text-muted-foreground mt-1">Node Types</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">Visual</div>
              <div className="text-xs text-muted-foreground mt-1">Editor</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">Real-time</div>
              <div className="text-xs text-muted-foreground mt-1">Execution</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center items-center px-6 sm:px-12">
        <div className="w-full max-w-sm">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <Zap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">Automation</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your credentials to access your workflows.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={submitting}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !email || !password}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Part of the{' '}
            <a href="https://maximo-seo.ai" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener">
              Maximo SEO
            </a>{' '}
            ecosystem
          </p>
        </div>
      </div>
    </div>
  );
}
