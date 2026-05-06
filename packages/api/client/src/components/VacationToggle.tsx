/** @legacy Pre-catalog scaffolding; new components should compose catalog primitives. */
import { useState, useEffect } from 'react';

interface VacationStatus {
  active: boolean;
  until: string | null;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function VacationToggle() {
  const [status, setStatus] = useState<VacationStatus | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [untilDate, setUntilDate] = useState(tomorrow());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/vacation')
      .then((r) => r.json())
      .then((data) => setStatus(data))
      .catch(() => setStatus({ active: false, until: null }));
  }, []);

  async function handleActivate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vacation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ until: untilDate }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? 'Failed to set vacation');
      } else {
        const data = await res.json();
        setStatus(data);
        setShowPicker(false);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function handleEnd() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vacation', { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? 'Failed to end vacation');
      } else {
        setStatus({ active: false, until: null });
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  if (status === null) return null;

  if (status.active && status.until) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            background: 'rgba(243, 156, 18, 0.15)',
            border: '1px solid var(--warning)',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 13,
            color: 'var(--warning)',
          }}
        >
          ✈️ Away until {formatDate(status.until)}
        </span>
        <button
          onClick={handleEnd}
          disabled={loading}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--ink-2)',
            fontSize: 12,
            padding: '4px 10px',
            minHeight: 32,
          }}
        >
          End now
        </button>
        {error && (
          <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>
        )}
      </div>
    );
  }

  if (showPicker) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="date"
          value={untilDate}
          min={tomorrow()}
          onChange={(e) => setUntilDate(e.target.value)}
          style={{ width: 140, fontSize: 14, padding: '4px 8px', minHeight: 36 }}
        />
        <button
          onClick={handleActivate}
          disabled={loading || !untilDate}
          style={{ fontSize: 13, padding: '4px 12px', minHeight: 36 }}
        >
          {loading ? '...' : 'Set'}
        </button>
        <button
          onClick={() => setShowPicker(false)}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--ink-2)',
            fontSize: 13,
            padding: '4px 10px',
            minHeight: 36,
          }}
        >
          Cancel
        </button>
        {error && (
          <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowPicker(true)}
      style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        color: 'var(--ink-2)',
        fontSize: 13,
        padding: '4px 12px',
        minHeight: 36,
      }}
    >
      ✈️ Vacation
    </button>
  );
}
