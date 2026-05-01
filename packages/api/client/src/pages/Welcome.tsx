import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lockup } from '../components/atoms/Logo/Lockup';
import { PageHead } from '../components/molecules/PageHead/PageHead';
import { FieldLabel } from '../components/atoms/FieldLabel/FieldLabel';
import { Button } from '../components/atoms/Button/Button';
import './Auth.css';

/* One-time auth bootstrap (#136). The API generates a setup token in its
   startup logs when no admin password is set; this page lets the operator
   paste the token and choose a password. */
export function Welcome() {
  const [token, setToken] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

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
    <div className="p7l-auth">
      <div className="p7l-auth__lockup">
        <Lockup stampSize={64} />
      </div>
      <PageHead
        size="sm"
        eyebrow="First-time setup"
        title="Claim this instance"
        subtitle="Paste the setup token from your server logs and pick a password."
      />
      <form onSubmit={submit} className="p7l-auth__form">
        <div className="p7l-auth__field">
          <FieldLabel htmlFor="setup-token" required>
            Setup token
          </FieldLabel>
          <input
            id="setup-token"
            aria-label="Setup token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ABCD-1234-EFGH"
            autoFocus
            required
            className="p7l-auth__input"
          />
        </div>
        <div className="p7l-auth__field">
          <FieldLabel htmlFor="setup-pw1" required hint="Minimum 12 characters.">
            Password
          </FieldLabel>
          <input
            id="setup-pw1"
            aria-label="Password"
            type="password"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            required
            className="p7l-auth__input"
          />
        </div>
        <div className="p7l-auth__field">
          <FieldLabel htmlFor="setup-pw2" required>
            Confirm password
          </FieldLabel>
          <input
            id="setup-pw2"
            aria-label="Confirm password"
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
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
          {submitting ? 'Setting up…' : 'Claim instance'}
        </Button>
      </form>
    </div>
  );
}
