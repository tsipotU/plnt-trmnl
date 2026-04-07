import { useState, useEffect, useCallback } from 'react';

interface Fact {
  id: number;
  text: string;
  source: 'seed' | 'enrichment';
  plant_id: number | null;
  plant_name: string | null;
  times_shown: number;
  disabled: number;
}

function SourceBadge({ source }: { source: 'seed' | 'enrichment' }) {
  const isSeed = source === 'seed';
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 6px',
        borderRadius: 4,
        background: isSeed ? 'rgba(160, 160, 160, 0.15)' : 'rgba(0, 168, 107, 0.15)',
        border: `1px solid ${isSeed ? 'var(--border)' : 'var(--accent)'}`,
        color: isSeed ? 'var(--text-secondary)' : 'var(--accent)',
        flexShrink: 0,
      }}
    >
      {isSeed ? 'seed' : 'enrichment'}
    </span>
  );
}

function FactItem({
  fact,
  onDisable,
}: {
  fact: Fact;
  onDisable: (id: number) => void;
}) {
  const [disabling, setDisabling] = useState(false);

  async function handleDisable() {
    setDisabling(true);
    try {
      const res = await fetch(`/api/facts/${fact.id}/disable`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to disable fact');
      onDisable(fact.id);
    } catch {
      setDisabling(false);
    }
  }

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        marginBottom: 8,
        opacity: fact.disabled ? 0.5 : 1,
      }}
    >
      {/* Header row: badges + thumbs down */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <SourceBadge source={fact.source} />
        <span
          style={{
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 4,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          {fact.plant_name ?? 'General'}
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            marginLeft: 'auto',
          }}
        >
          shown {fact.times_shown}x
        </span>
        {!fact.disabled && (
          <button
            onClick={handleDisable}
            disabled={disabling}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              padding: '6px 10px',
              fontSize: 16,
              borderRadius: 6,
              minHeight: 36,
              minWidth: 36,
              lineHeight: 1,
              cursor: disabling ? 'not-allowed' : 'pointer',
              opacity: disabling ? 0.5 : 1,
            }}
            title="Disable fact"
            aria-label="Thumbs down — disable fact"
          >
            👎
          </button>
        )}
      </div>

      {/* Fact text */}
      <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-primary)' }}>{fact.text}</p>
    </div>
  );
}

export function FactManagement() {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disabledOpen, setDisabledOpen] = useState(false);

  const fetchFacts = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = q.trim() ? `/api/facts?q=${encodeURIComponent(q.trim())}` : '/api/facts';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load facts (${res.status})`);
      const data: Fact[] = await res.json();
      setFacts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => fetchFacts(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchFacts]);

  function handleDisable(id: number) {
    setFacts((prev) =>
      prev.map((f) => (f.id === id ? { ...f, disabled: 1 } : f))
    );
  }

  const activeFacts = facts.filter((f) => !f.disabled);
  const disabledFacts = facts.filter((f) => f.disabled);

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Facts</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Manage plant facts shown on your TRMNL display
        </p>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: 16, position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-secondary)',
            fontSize: 16,
            pointerEvents: 'none',
          }}
        >
          🔍
        </span>
        <input
          type="search"
          placeholder="Search facts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 38 }}
          aria-label="Search facts"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px 0' }}
        >
          Loading facts...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div
          className="card"
          style={{
            background: 'rgba(231, 76, 60, 0.1)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
          }}
        >
          {error}
        </div>
      )}

      {/* Active facts */}
      {!loading && !error && (
        <>
          {activeFacts.length === 0 ? (
            <div
              style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px 0' }}
            >
              {search ? 'No facts match your search.' : 'No active facts yet.'}
            </div>
          ) : (
            <>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                {activeFacts.length} active {activeFacts.length === 1 ? 'fact' : 'facts'}
              </p>
              {activeFacts.map((fact) => (
                <FactItem key={fact.id} fact={fact} onDisable={handleDisable} />
              ))}
            </>
          )}

          {/* Disabled section */}
          {disabledFacts.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <button
                onClick={() => setDisabledOpen((o) => !o)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: 14,
                  padding: '10px 14px',
                  borderRadius: 6,
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: 44,
                  cursor: 'pointer',
                }}
                aria-expanded={disabledOpen}
              >
                <span>Disabled ({disabledFacts.length})</span>
                <span style={{ fontSize: 12 }}>{disabledOpen ? '▲' : '▼'}</span>
              </button>

              {disabledOpen && (
                <div style={{ marginTop: 8 }}>
                  {disabledFacts.map((fact) => (
                    <FactItem key={fact.id} fact={fact} onDisable={handleDisable} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
