import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface ArchivedPlant {
  id: number;
  name: string;
  species: string | null;
  identifier: string | null;
  archived_at: string | null;
  archive_reason: 'died' | 'gave_away' | 'moved' | 'other' | null;
  archive_note: string | null;
  illustration_path: string | null;
}

type ReasonFilter = 'all' | 'died' | 'gave_away' | 'moved' | 'other';

const REASON_LABELS: Record<NonNullable<ArchivedPlant['archive_reason']>, string> = {
  died: 'Died',
  gave_away: 'Gave away',
  moved: 'Moved',
  other: 'Other',
};

const REASON_EMOJI: Record<NonNullable<ArchivedPlant['archive_reason']>, string> = {
  died: '🕊️',
  gave_away: '🎁',
  moved: '📦',
  other: '📝',
};

function formatArchivedAt(ts: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ArchivedPlants() {
  const [plants, setPlants] = useState<ArchivedPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReasonFilter>('all');

  useEffect(() => {
    fetch('/api/plants/archived')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        setPlants(Array.isArray(data) ? (data as ArchivedPlant[]) : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const visible = filter === 'all' ? plants : plants.filter((p) => p.archive_reason === filter);

  const reasonCounts = plants.reduce<Record<string, number>>((acc, p) => {
    if (p.archive_reason) acc[p.archive_reason] = (acc[p.archive_reason] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link
          to="/"
          style={{
            color: 'var(--text-secondary)',
            fontSize: 24,
            lineHeight: 1,
            minWidth: 44,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Back"
        >
          ‹
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Archived</h1>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading…</p>
      ) : plants.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
          <p style={{ fontSize: 15 }}>No archived plants yet.</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            When you archive a plant, it shows up here.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
              All ({plants.length})
            </FilterChip>
            {(['died', 'gave_away', 'moved', 'other'] as const).map((r) =>
              reasonCounts[r] ? (
                <FilterChip key={r} active={filter === r} onClick={() => setFilter(r)}>
                  {REASON_EMOJI[r]} {REASON_LABELS[r]} ({reasonCounts[r]})
                </FilterChip>
              ) : null,
            )}
          </div>

          <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none' }}>
            {visible.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/plants/${p.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    textDecoration: 'none',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div style={{ fontSize: 28, flexShrink: 0 }}>
                    {p.archive_reason ? REASON_EMOJI[p.archive_reason] : '📦'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                      {p.name}
                      {p.identifier && (
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
                          {' '}
                          · {p.identifier}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        marginTop: 2,
                      }}
                    >
                      {p.archive_reason ? REASON_LABELS[p.archive_reason] : 'Archived'} ·{' '}
                      {formatArchivedAt(p.archived_at)}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: 999,
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? 'white' : 'var(--text-secondary)',
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
