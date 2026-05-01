import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackBar } from '../components/molecules/BackBar/BackBar.js';
import { PageHead } from '../components/molecules/PageHead/PageHead.js';
import { FilterRail } from '../components/molecules/FilterRail/FilterRail.js';
import { ArchiveCard, type ArchiveStamp } from '../components/molecules/ArchiveCard/ArchiveCard.js';
import { EmptyState } from '../components/molecules/EmptyState/EmptyState.js';
import { Chip } from '../components/atoms/Chip/Chip.js';
import './ArchivedPlants.css';

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

function buildStamps(p: ArchivedPlant): ArchiveStamp[] {
  const stamps: ArchiveStamp[] = [];
  if (p.archive_reason) {
    stamps.push({ label: REASON_LABELS[p.archive_reason], memorial: p.archive_reason === 'died' });
  }
  if (p.archived_at) {
    stamps.push({ label: formatArchivedAt(p.archived_at) });
  }
  return stamps;
}

export function ArchivedPlants() {
  const navigate = useNavigate();
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
    <div className="p7l-archived">
      <BackBar onBack={() => navigate('/')} backLabel="← Today" />

      {loading && (
        <EmptyState>Loading…</EmptyState>
      )}

      {!loading && plants.length === 0 && (
        <EmptyState>
          🌱 No archived plants yet.
          <br />
          When you archive a plant, it shows up here.
        </EmptyState>
      )}

      {!loading && plants.length > 0 && (
        <>
          <PageHead
            eyebrow={`${plants.length} ${plants.length === 1 ? 'entry' : 'entries'}`}
            title="Archive"
            subtitle="Plants that left, were given away, or didn't make it."
          />

          <FilterRail>
            <Chip
              toggleable
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              All ({plants.length})
            </Chip>
            {(['died', 'gave_away', 'moved', 'other'] as const).map((r) =>
              reasonCounts[r] ? (
                <Chip
                  key={r}
                  toggleable
                  active={filter === r}
                  onClick={() => setFilter(r)}
                >
                  {REASON_EMOJI[r]} {REASON_LABELS[r]} ({reasonCounts[r]})
                </Chip>
              ) : null,
            )}
          </FilterRail>

          {visible.length === 0 ? (
            <EmptyState align="left">No entries in this category.</EmptyState>
          ) : (
            visible.map((p) => (
              <ArchiveCard
                key={p.id}
                leadingIcon={p.archive_reason ? REASON_EMOJI[p.archive_reason] : '📦'}
                name={
                  p.identifier ? (
                    <>
                      {p.name}{' '}
                      <span style={{ fontWeight: 400, color: 'var(--ink-2)' }}>
                        · {p.identifier}
                      </span>
                    </>
                  ) : (
                    p.name
                  )
                }
                species={p.species ?? undefined}
                stamps={buildStamps(p)}
                note={p.archive_note ?? undefined}
                onClick={() => navigate(`/archive/${p.id}`)}
                aria-label={`Open memorial for ${p.name}`}
              />
            ))
          )}

          <div style={{ height: 96 }} />
        </>
      )}
    </div>
  );
}
