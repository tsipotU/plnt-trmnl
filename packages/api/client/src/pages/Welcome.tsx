import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * One-time auth bootstrap (#136). The API generates a setup token in its
 * startup logs when no admin password is set; this page lets the operator
 * paste the token and choose a password. After success a session cookie is
 * issued and we redirect to the dashboard.
 *
 * Route: `/welcome`. We don't reuse `/setup` because that's the TRMNL device
 * setup page (different feature, established earlier).
 */
export function Welcome() {
  const [token, setToken] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // If admin already set up, this page shouldn't be reachable — bounce home.
  useEffect(() => {
    fetch('/api/auth/setup-token').then((r) => {
      if (r.status === 404) navigate('/login', { replace: true });
    });
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw1 !== pw2) {
      setError('Passwords do not match');
      return;
    }
    if (pw1.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), password: pw1 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Setup failed (${res.status})`);
        return;
      }
      navigate('/', { replace: true });
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
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Welcome to PLNT</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Enter the setup token from your server logs to claim this instance.
        </p>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          aria-label="Setup token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Setup token (e.g. ABCD-1234-EFGH)"
          autoFocus
          required
          style={{ fontSize: 16, padding: '12px 14px' }}
        />
        <input
          aria-label="Password"
          type="password"
          value={pw1}
          onChange={(e) => setPw1(e.target.value)}
          placeholder="Choose a password (min 12 chars)"
          required
          style={{ fontSize: 16, padding: '12px 14px' }}
        />
        <input
          aria-label="Confirm password"
          type="password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          placeholder="Confirm password"
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
          {submitting ? 'Setting up…' : 'Claim instance'}
        </button>
      </form>
    </div>
  );
}
