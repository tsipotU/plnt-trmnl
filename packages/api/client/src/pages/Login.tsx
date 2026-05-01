import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lockup } from '../components/atoms/Logo/Lockup';
import { PageHead } from '../components/molecules/PageHead/PageHead';
import { FieldLabel } from '../components/atoms/FieldLabel/FieldLabel';
import { Button } from '../components/atoms/Button/Button';
import './Auth.css';

/* Single-field password login (#136). On success a session cookie is issued
   by the server; we redirect to the original destination if `?next=` was set,
   otherwise to the dashboard. */
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
    <div className="p7l-auth">
      <div className="p7l-auth__lockup">
        <Lockup stampSize={64} />
      </div>
      <PageHead size="sm" title="Welcome back" />
      <form onSubmit={submit} className="p7l-auth__form">
        <div className="p7l-auth__field">
          <FieldLabel htmlFor="login-pw" required>
            Password
          </FieldLabel>
          <input
            id="login-pw"
            aria-label="Password"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
            required
            className="p7l-auth__input"
          />
        </div>
        {error && (
          <div role="alert" className="p7l-auth__error">
            {error}
          </div>
        )}
        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={submitting}
          loading={submitting}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
