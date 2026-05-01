/** @legacy Pre-catalog scaffolding; new components should compose catalog primitives. */
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

type State = 'loading' | 'auth' | 'needs-setup' | 'needs-login';

/**
 * Wraps protected routes (#136). On mount, hits /api/auth/me to see if the
 * user has a valid session. If 401, hits /api/auth/setup-token — if that
 * succeeds, the instance hasn't been claimed yet → redirect to /welcome.
 * Otherwise → /login. Public routes (/welcome, /login) bypass entirely.
 *
 * Note: the gate runs once per route change. Stale state if the server
 * invalidates a session is handled at request time by the API returning 401,
 * which the calling page must handle (PR follow-up: add a global 401 handler
 * that triggers re-mount).
 */

const PUBLIC_ROUTES = new Set(['/welcome', '/login']);

export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>('loading');
  const location = useLocation();

  useEffect(() => {
    if (PUBLIC_ROUTES.has(location.pathname)) {
      setState('auth');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (cancelled) return;
        if (meRes.ok) {
          setState('auth');
          return;
        }
        // 401 — figure out if we're pre-setup or just logged out.
        const tokRes = await fetch('/api/auth/setup-token');
        if (cancelled) return;
        setState(tokRes.ok ? 'needs-setup' : 'needs-login');
      } catch {
        // Network error — be permissive (assume user is local/dev) so we
        // don't lock the operator out by failing closed.
        if (!cancelled) setState('auth');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (state === 'loading') {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading…
      </div>
    );
  }
  if (state === 'needs-setup') {
    return <Navigate to="/welcome" replace />;
  }
  if (state === 'needs-login') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}
