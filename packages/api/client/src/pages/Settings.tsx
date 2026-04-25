import { useEffect, useRef, useState } from 'react';
import { useDevInfo } from '../hooks/useDevInfo.js';
import { buildAiSetupPrompt } from '../lib/ai-setup-prompt';

export function Settings() {
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
    <div style={{ paddingBottom: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Settings</h1>

      <div className="card" style={{ marginBottom: 12 }}>
        <h2
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 12,
          }}
        >
          Connect your AI
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '60ch', fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>
          plant-trmnl needs help filling in care data, facts, and species info. Connect any AI tool by copying the prompt below and pasting it into a scheduled task (Claude Desktop, ChatGPT scheduled tasks, Cursor, n8n, …).
        </p>
        <button
          onClick={handleCopy}
          style={{
            padding: '0.6rem 1rem',
            background: 'var(--accent, #00A86B)',
            color: 'var(--bg-card, #1a1a1a)',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
            minHeight: 44,
          }}
        >
          Copy AI setup prompt
        </button>
        {toast && (
          <div role="status" style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
            {toast}
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
          {pendingPlants !== null && (
            <div>{pendingPlants} {pendingPlants === 1 ? 'plant' : 'plants'} pending enrichment</div>
          )}
          {pendingConditions !== null && (
            <div>{pendingConditions} {pendingConditions === 1 ? 'condition' : 'conditions'} awaiting care update</div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h2
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 12,
          }}
        >
          Developer
        </h2>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>
              Show developer info
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Reveal enrichment source, raw intervals, and timestamps on plant
              detail pages. Off by default.
            </div>
          </div>
          <input
            type="checkbox"
            role="switch"
            aria-label="Show developer info"
            checked={devInfoEnabled}
            onChange={(e) => setDevInfoEnabled(e.target.checked)}
            style={{
              width: 44,
              height: 28,
              minHeight: 28,
              flexShrink: 0,
              cursor: 'pointer',
            }}
          />
        </label>
      </div>
    </div>
  );
}
