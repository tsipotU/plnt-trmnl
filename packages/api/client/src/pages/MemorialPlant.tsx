import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackBar } from '../components/molecules/BackBar/BackBar.js';
import { SectionHead } from '../components/molecules/SectionHead/SectionHead.js';
import { DetailDataGrid, DataCell } from '../components/molecules/DetailDataGrid/DetailDataGrid.js';
import { InfoCard } from '../components/molecules/InfoCard/InfoCard.js';
import { EmptyState } from '../components/molecules/EmptyState/EmptyState.js';
import { Button } from '../components/atoms/Button/Button.js';
import './MemorialPlant.css';

interface MemorialPlantData {
  id: number;
  name: string;
  species: string | null;
  archived: number;
  archived_at: string | null;
  archive_reason: 'died' | 'gave_away' | 'moved' | 'other' | null;
  archive_note: string | null;
  created_at: string;
  location: string | null;
  illustration_path: string | null;
}

interface MemorialStats {
  waterings: number;
  offspring: number;
  calibration_cycles: number;
  lifespan_days: number;
  joined_at: string;
  archived_at: string | null;
}

interface MemorialResponse {
  plant: MemorialPlantData;
  stats: MemorialStats;
}

const REASON_LABEL: Record<NonNullable<MemorialPlantData['archive_reason']>, string> = {
  died: 'It died',
  gave_away: 'Gave it away',
  moved: 'Moved away',
  other: 'Other',
};

const REASON_EMOJI: Record<NonNullable<MemorialPlantData['archive_reason']>, string> = {
  died: '🕊️',
  gave_away: '🎁',
  moved: '📦',
  other: '📝',
};

function formatDate(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatLifespan(days: number): string {
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return remMonths > 0 ? `${years}y ${remMonths}m` : `${years} year${years === 1 ? '' : 's'}`;
}

export function MemorialPlant() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<MemorialResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/plants/${id}/memorial`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d: MemorialResponse | null) => {
        if (d) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleRestore() {
    if (!id || restoring) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/plants/${id}/restore`, { method: 'POST' });
      if (res.ok) {
        navigate(`/plants/${id}`);
      } else {
        setRestoring(false);
      }
    } catch {
      setRestoring(false);
    }
  }

  if (loading) {
    return (
      <div className="p7l-memorial">
        <BackBar onBack={() => navigate('/archived')} backLabel="← Archive" />
        <EmptyState>Loading…</EmptyState>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="p7l-memorial">
        <BackBar onBack={() => navigate('/archived')} backLabel="← Archive" />
        <EmptyState>Plant not found.</EmptyState>
      </div>
    );
  }

  const { plant, stats } = data;
  const lifespan = formatLifespan(stats.lifespan_days);
  const reasonLabel = plant.archive_reason ? REASON_LABEL[plant.archive_reason] : null;
  const reasonEmoji = plant.archive_reason ? REASON_EMOJI[plant.archive_reason] : null;

  return (
    <div className="p7l-memorial">
      <BackBar
        onBack={() => navigate('/archived')}
        backLabel="← Archive"
        eyebrow={reasonLabel ?? undefined}
      />

      <header className="p7l-memorial__hero">
        <div className="p7l-memorial__pic" aria-hidden="true">
          {plant.illustration_path ? (
            <img
              src={`/api/illustrations/${encodeURIComponent(plant.illustration_path)}`}
              alt={plant.species ?? plant.name}
            />
          ) : (
            <span className="p7l-memorial__pic-fallback">{reasonEmoji ?? '🪴'}</span>
          )}
        </div>
        <span className="p7l-memorial__eyebrow">In memoriam</span>
        <h1 className="p7l-memorial__name">{plant.name}</h1>
        <p className="p7l-memorial__lifespan">lived in your home for {lifespan}</p>
      </header>

      <DetailDataGrid cols={2}>
        <DataCell label="Joined" value={formatDate(stats.joined_at)} />
        <DataCell label="Archived" value={formatDate(stats.archived_at)} />
        <DataCell label="Waterings" value={String(stats.waterings)} />
        <DataCell label="Offspring" value={String(stats.offspring)} />
        <DataCell label="Calibration cyc" value={String(stats.calibration_cycles)} />
        <DataCell label="Lived in" value={plant.location ?? '—'} />
      </DetailDataGrid>

      {(plant.archive_reason || plant.archive_note) && (
        <>
          <SectionHead label="Cause" />
          <div style={{ padding: '0 18px 12px' }}>
            <InfoCard title={reasonLabel ?? undefined}>
              {plant.archive_note ?? (
                <span style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>
                  No note recorded.
                </span>
              )}
            </InfoCard>
          </div>
        </>
      )}

      <SectionHead label="Restore" />
      <div className="p7l-memorial__danger">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          fullWidth
          onClick={handleRestore}
          disabled={restoring}
          loading={restoring}
        >
          {restoring ? 'Restoring…' : 'Restore plant'}
        </Button>
      </div>

      <div style={{ height: 96 }} />
    </div>
  );
}
