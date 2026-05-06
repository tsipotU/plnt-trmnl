import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevInfo } from '../hooks/useDevInfo.js';
import { buildAiSetupPrompt } from '../lib/ai-setup-prompt';

import { BackBar } from '../components/molecules/BackBar/BackBar.js';
import { PageHead } from '../components/molecules/PageHead/PageHead.js';
import { SectionHead } from '../components/molecules/SectionHead/SectionHead.js';
import { SettingsRow } from '../components/molecules/SettingsRow/SettingsRow.js';
import { InfoCard } from '../components/molecules/InfoCard/InfoCard.js';
import { Button } from '../components/atoms/Button/Button.js';
import { Toggle } from '../components/atoms/Toggle/Toggle.js';
import { Toast } from '../components/molecules/Toast/Toast.js';
import './Settings.css';

export function Settings() {
  const navigate = useNavigate();
  const [devInfoEnabled, setDevInfoEnabled] = useDevInfo();

  const [pendingPlants, setPendingPlants] = useState<number | null>(null);
  const [pendingConditions, setPendingConditions] = useState<number | null>(null);
  const [sampleFacts, setSampleFacts] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/facts/samples?n=10')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Array<{ text: string }>) => setSampleFacts(rows.map((r) => r.text)))
      .catch(() => setSampleFacts([]));
    fetch('/api/plants?enrichment=pending')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: unknown[]) => setPendingPlants(rows.length))
      .catch(() => setPendingPlants(null));
    fetch('/api/conditions?care_update=pending')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: unknown[]) => setPendingConditions(rows.length))
      .catch(() => setPendingConditions(null));
  }, []);

  const handleCopy = async () => {
    try {
      const prompt = buildAiSetupPrompt({ baseUrl: window.location.origin, sampleFacts });
      await navigator.clipboard.writeText(prompt);
      setToast('Setup prompt copied. Paste into your AI tool of choice.');
    } catch {
      setToast('Could not copy — please copy manually.');
    }
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  return (
    <div className="p7l-settings">
      <BackBar onBack={() => navigate('/')} backLabel="← Today" />
      <PageHead eyebrow={`Instance · v${__APP_VERSION__}`} title="Settings" />

      <SectionHead as="h2" label="Connect your AI" />
      <div style={{ padding: '0 18px 12px' }}>
        <InfoCard>
          plnt-trmnl needs help filling in care data, facts, and species info.
          Connect any AI tool by copying the prompt below and pasting it into a
          scheduled task (Claude Desktop, ChatGPT scheduled tasks, Cursor, n8n,
          …).
        </InfoCard>
      </div>
      <div style={{ padding: '0 18px 8px' }}>
        <Button variant="primary" size="lg" onClick={handleCopy}>
          Copy AI setup prompt
        </Button>
      </div>
      {(pendingPlants !== null || pendingConditions !== null) && (
        <div
          role="status"
          style={{
            padding: '0 18px 16px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.04em',
            color: 'var(--ink-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {pendingPlants !== null && (
            <div>
              {pendingPlants} {pendingPlants === 1 ? 'plant' : 'plants'} pending enrichment
            </div>
          )}
          {pendingConditions !== null && (
            <div>
              {pendingConditions}{' '}
              {pendingConditions === 1 ? 'condition' : 'conditions'} awaiting care update
            </div>
          )}
        </div>
      )}

      <SectionHead as="h2" label="Developer" />
      <SettingsRow
        label="Show developer info"
        description="Reveal enrichment source, raw intervals, and timestamps on plant detail pages. Off by default."
        trailing={
          <Toggle
            checked={devInfoEnabled}
            onCheckedChange={setDevInfoEnabled}
            label="Show developer info"
          />
        }
      />

      <div style={{ height: 96 }} />

      <Toast
        open={!!toast}
        message={toast ?? ''}
        durationMs={0}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
