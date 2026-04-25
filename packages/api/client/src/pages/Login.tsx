import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Single-field password login (#136). On success a session cookie is issued
 * by the server; we redirect to the original destination if `?next=` was set,
 * otherwise to the dashboard.
 */
export function Login() {
  const [pw, setPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        if (res.status === 401) setError('Incorrect password');
        else if (res.status === 403) setError('Setup not complete — visit /welcome first');
        else setError(`Error ${res.status}`);
        return;
      }
      const next = params.get('next');
      navigate(next && next.startsWith('/') ? next : '/', { replace: true });
    } catch {
      setError('Network error — could not reach the server');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 420, margin: '40px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🪴</div>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Welcome back</h1>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          aria-label="Password"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          autoFocus
          required
          style={{ fontSize: 16, padding: '12px 14px' }}
        />
        {error && (
          <div role="alert" style={{ color: 'var(--danger)' }}>
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            padding: '14px 0',
            fontSize: 17,
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
