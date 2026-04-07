import { useState } from 'react';

const RENDERER_URL = 'http://localhost:3901';

interface StatusRowProps {
  label: string;
  value: React.ReactNode;
}

function StatusRow({ label, value }: StatusRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

const SETUP_STEPS = [
  'Log in to usetrmnl.com',
  'Create a Private Plugin (Developer Edition required)',
  'Set Strategy to "Webhook"',
  'Copy Plugin UUID → set TRMNL_PLUGIN_UUID in .env',
  'Copy API Key → set TRMNL_API_KEY in .env',
  'Add plugin to device Playlist',
  'Set refresh interval to 30 min',
];

export function TrmnlSetup() {
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleTestPush() {
    setPushing(true);
    setPushResult(null);
    try {
      const res = await fetch(`${RENDERER_URL}/render`, { method: 'POST' });
      if (!res.ok) throw new Error(`Renderer returned ${res.status}`);
      setPushResult({ ok: true, message: 'Render triggered successfully.' });
    } catch (err) {
      setPushResult({
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : 'Failed to reach renderer. Is Docker Compose running?',
      });
    } finally {
      setPushing(false);
    }
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>TRMNL Setup</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Connect your TRMNL e-ink display to Plant TRMNL
        </p>
      </div>

      {/* Status card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Connection Status</h2>
        <StatusRow label="Plugin UUID" value={<code style={{ fontSize: 12 }}>Set in .env</code>} />
        <StatusRow label="Strategy" value="Webhook" />
        <StatusRow
          label="Last push"
          value={
            <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
              No data yet
            </span>
          }
        />
        <StatusRow
          label="Refresh interval"
          value={
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>30 min</span>
          }
        />
      </div>

      {/* Setup instructions */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Setup Instructions</h2>
        <ol style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SETUP_STEPS.map((step, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 1,
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                {step}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Environment variables reference */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Required .env Variables</h2>
        <div
          style={{
            background: 'var(--bg-primary)',
            borderRadius: 6,
            padding: '12px 14px',
            fontFamily: 'monospace',
            fontSize: 13,
            lineHeight: 1.8,
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <span style={{ color: 'var(--accent)' }}>TRMNL_PLUGIN_UUID</span>=your-uuid-here
          </div>
          <div>
            <span style={{ color: 'var(--accent)' }}>TRMNL_API_KEY</span>=your-api-key-here
          </div>
          <div>
            <span style={{ color: 'var(--accent)' }}>RENDER_CRON</span>=0 5 * * *
          </div>
        </div>
      </div>

      {/* Test push button */}
      {pushResult && (
        <div
          className="card"
          style={{
            marginBottom: 12,
            background: pushResult.ok ? 'rgba(0,168,107,0.1)' : 'rgba(231,76,60,0.1)',
            border: `1px solid ${pushResult.ok ? 'var(--accent)' : 'var(--danger)'}`,
            color: pushResult.ok ? 'var(--accent)' : 'var(--danger)',
            fontSize: 14,
          }}
        >
          {pushResult.message}
        </div>
      )}

      <button
        onClick={handleTestPush}
        disabled={pushing}
        style={{
          width: '100%',
          background: pushing ? 'rgba(0,168,107,0.4)' : 'var(--accent)',
          color: '#fff',
          fontSize: 16,
          fontWeight: 600,
          minHeight: 52,
          borderRadius: 8,
          cursor: pushing ? 'not-allowed' : 'pointer',
        }}
      >
        {pushing ? 'Triggering render...' : 'Test Push (Trigger Render)'}
      </button>

      <p
        style={{
          marginTop: 10,
          fontSize: 12,
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}
      >
        Triggers an immediate re-render on the renderer container (localhost:3901)
      </p>
    </div>
  );
}
