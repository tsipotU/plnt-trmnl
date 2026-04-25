import { useNavigate } from 'react-router-dom';
import { useAiConnection } from '../hooks/useAiConnection';

export interface Plant {
  id: number;
  name: string;
  common_name: string | null;
  species: string | null;
  identifier: string | null;
  pot_size_cm: number | null;
  plant_size: 'small' | 'medium' | 'large' | null;
  location: string | null;
  light_level: 'low' | 'medium' | 'bright_indirect' | 'direct' | null;
  illustration_path: string | null;
  next_water_date: string | null;
  last_watered_at: string | null;
  enrichment_status: 'pending' | 'complete' | 'failed';
  archived: number;
  is_converged?: number;
  current_interval?: number;
}

interface PlantCardProps {
  plant: Plant;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function lightLevelLabel(level: string | null): string {
  const labels: Record<string, string> = {
    low: 'Low light',
    medium: 'Medium light',
    bright_indirect: 'Bright indirect',
    direct: 'Direct sun',
  };
  return level ? (labels[level] ?? level) : '';
}

export function PlantCard({ plant }: PlantCardProps) {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const isOverdue =
    plant.next_water_date != null && plant.next_water_date < today;
  const overdueDays =
    isOverdue && plant.next_water_date ? Math.abs(daysUntil(plant.next_water_date)) : 0;
  // #131 — only show "✨ Enrichment pending" badge when an AI tool has been
  // recently active. Otherwise the badge would be permanent for users who
  // haven't connected one (under pull-based enrichment).
  const { connected: aiConnected } = useAiConnection();
  const isPending = plant.enrichment_status === 'pending' && aiConnected;

  return (
    <div
      className="card"
      onClick={() => navigate(`/plants/${plant.id}`)}
      style={{
        cursor: 'pointer',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        marginBottom: 12,
      }}
    >
      {/* Illustration thumbnail */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {plant.illustration_path ? (
          <img
            src={plant.illustration_path}
            alt={plant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: 24 }}>🪴</span>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + identifier + species */}
        <div
          style={{
            fontWeight: 700,
            fontSize: 17,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {plant.name}
        </div>
        {plant.identifier && (
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-primary)',
              opacity: 0.85,
              marginTop: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {plant.identifier}
          </div>
        )}
        {plant.species && (
          <div
            style={{
              fontStyle: 'italic',
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginTop: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {plant.species}
          </div>
        )}

        {/* Location + light + pot size */}
        {(plant.location || plant.pot_size_cm || plant.light_level) && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginTop: 4,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {plant.location && <span>{plant.location}</span>}
            {plant.pot_size_cm && <span>{plant.pot_size_cm}cm pot</span>}
            {plant.light_level && <span>{lightLevelLabel(plant.light_level)}</span>}
          </div>
        )}

        {/* Badges row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {/* Next watering badge */}
          {plant.next_water_date && !isOverdue && (
            <span
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: '2px 7px',
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              💧 {formatDate(plant.next_water_date)}
            </span>
          )}

          {/* Overdue badge */}
          {isOverdue && (
            <span
              style={{
                background: 'rgba(231, 76, 60, 0.15)',
                border: '1px solid var(--danger)',
                borderRadius: 4,
                padding: '2px 7px',
                fontSize: 12,
                color: 'var(--danger)',
                fontWeight: 600,
              }}
            >
              💧 Overdue {overdueDays}d
            </span>
          )}

          {/* Enrichment pending badge */}
          {isPending && (
            <span
              style={{
                background: 'rgba(243, 156, 18, 0.15)',
                border: '1px solid var(--warning)',
                borderRadius: 4,
                padding: '2px 7px',
                fontSize: 12,
                color: 'var(--warning)',
              }}
            >
              ✨ Enrichment pending
            </span>
          )}

          {/* #60 — dialed-in badge for converged plants */}
          {plant.is_converged === 1 && (
            <span
              title={
                plant.current_interval
                  ? `${plant.current_interval}-day cadence, calibrated to your home.`
                  : 'Calibrated to your home.'
              }
              aria-label="Dialed in"
              style={{
                background: 'var(--accent-muted, rgba(0, 168, 107, 0.15))',
                border: '1px solid var(--accent)',
                borderRadius: 4,
                padding: '2px 7px',
                fontSize: 12,
                color: 'var(--accent)',
              }}
            >
              🌿 Dialed in
            </span>
          )}
        </div>
      </div>

      {/* Chevron */}
      <div
        style={{
          color: 'var(--text-secondary)',
          fontSize: 18,
          lineHeight: 1,
          alignSelf: 'center',
          flexShrink: 0,
        }}
      >
        ›
      </div>
    </div>
  );
}
