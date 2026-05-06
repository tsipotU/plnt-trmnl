import { useState } from 'react';
import { PageHead } from '../components/molecules/PageHead/PageHead';
import { SectionHead } from '../components/molecules/SectionHead/SectionHead';
import { SettingsRow } from '../components/molecules/SettingsRow/SettingsRow';
import { InfoCard } from '../components/molecules/InfoCard/InfoCard';
import { Button } from '../components/atoms/Button/Button';
import { Banner } from '../components/atoms/Banner/Banner';
import './TrmnlSetup.css';

const RENDERER_URL = '/api/trmnl';

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
    <div className="p7l-trmnl-setup">
      <PageHead
        eyebrow="Device"
        title="TRMNL setup"
        subtitle="Connect your TRMNL e-ink display to p7l."
      />

      <SectionHead as="h2" label="Connection" />
      <SettingsRow
        label="Plugin UUID"
        trailing={<code className="p7l-trmnl-setup__mono">Set in .env</code>}
      />
      <SettingsRow label="Strategy" trailing="Webhook" />
      <SettingsRow label="Last push" trailing="No data yet" />
      <SettingsRow label="Refresh interval" trailing="30 min" />

      <SectionHead as="h2" label="Setup instructions" />
      <ol className="p7l-trmnl-setup__steps">
        {SETUP_STEPS.map((step, i) => (
          <li key={i}>
            <span className="p7l-trmnl-setup__step-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="p7l-trmnl-setup__step-text">{step}</span>
          </li>
        ))}
      </ol>

      <SectionHead as="h2" label="Required .env variables" />
      <div style={{ padding: '0 18px 12px' }}>
        <InfoCard>
          <pre className="p7l-trmnl-setup__envblock">
            <code>
              <span className="p7l-trmnl-setup__envkey">TRMNL_PLUGIN_UUID</span>=your-uuid-here{'\n'}
              <span className="p7l-trmnl-setup__envkey">TRMNL_API_KEY</span>=your-api-key-here{'\n'}
              <span className="p7l-trmnl-setup__envkey">RENDER_CRON</span>=0 5 * * *
            </code>
          </pre>
        </InfoCard>
      </div>

      <SectionHead as="h2" label="Test push" />
      {pushResult && (
        <div style={{ padding: '0 18px 10px' }}>
          <Banner tone={pushResult.ok ? 'success' : 'error'}>{pushResult.message}</Banner>
        </div>
      )}
      <div style={{ padding: '0 18px 8px' }}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={pushing}
          disabled={pushing}
          onClick={handleTestPush}
        >
          {pushing ? 'Triggering render…' : 'Trigger render now'}
        </Button>
      </div>
      <p className="p7l-trmnl-setup__hint">
        Triggers an immediate re-render on the renderer container (localhost:3901).
      </p>

      <div style={{ height: 96 }} />
    </div>
  );
}
