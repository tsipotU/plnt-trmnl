import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
  died: 'It died 😢',
  gave_away: 'Gave it away',
  moved: 'Moved away',
  other: 'Other',
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
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
        Loading…
      </div>
    );
  }
  if (notFound || !data) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Plant not found.</p>
        <button
          onClick={() => navigate('/archived')}
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          ← Back to archive
        </button>
      </div>
    );
  }

  const { plant, stats } = data;
  const lifespan = formatLifespan(stats.lifespan_days);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        {plant.illustration_path ? (
          <img
            src={`/api/illustrations/${plant.illustration_path}`}
            alt={plant.species ?? plant.name}
            style={{
              maxWidth: 200,
              maxHeight: 200,
              filter: 'grayscale(0.7)',
              opacity: 0.85,
              marginBottom: 16,
            }}
          />
        ) : (
          <div
            style={{ fontSize: 80, marginBottom: 16, filter: 'grayscale(0.5)', opacity: 0.7 }}
          >
            🪴
          </div>
        )}
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          In memoriam — {plant.name}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          lived in your home for {lifespan}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatTile emoji="🌊" value={stats.waterings} label="waterings" />
        <StatTile emoji="🌿" value={stats.offspring} label="offspring" />
        <StatTile emoji="📈" value={stats.calibration_cycles} label="calibration cycles" />
        <StatTile
          emoji="📅"
          value=""
          label={`Joined ${formatDate(stats.joined_at)} · Archived ${formatDate(
            stats.archived_at,
          )}`}
        />
      </div>

      {plant.archive_reason && (
        <div
          style={{
            padding: 16,
            marginBottom: 16,
            background: 'var(--bg-card)',
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: 14 }}>
            <strong>Cause:</strong> {REASON_LABEL[plant.archive_reason]}
            {plant.archive_note ? ` — ${plant.archive_note}` : ''}
          </div>
        </div>
      )}

      {plant.location && (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
          Lived in: {plant.location}
        </p>
      )}

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <button
          type="button"
          onClick={handleRestore}
          disabled={restoring}
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            padding: '8px 16px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            cursor: restoring ? 'wait' : 'pointer',
            fontSize: 13,
          }}
        >
          {restoring ? 'Restoring…' : 'Restore plant'}
        </button>
      </div>
    </div>
  );
}

function StatTile({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: number | string;
  label: string;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 12,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</div>
      {value !== '' && <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>}
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  );
}
