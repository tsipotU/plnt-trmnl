import { useState } from 'react';

export interface ConditionCardData {
  name: string;
  severity: 'warning' | 'info';
  symptoms?: string | null;
  remedy?: string | null;
  prevention?: string | null;
  tags?: string[];
}

interface Props {
  condition: ConditionCardData;
}

const SEVERITY_GLYPH: Record<ConditionCardData['severity'], string> = {
  warning: '⚠',
  info: 'ℹ',
};

const SEVERITY_COLOR: Record<ConditionCardData['severity'], string> = {
  warning: 'var(--warn, #d97706)',
  info: 'var(--accent, #00A86B)',
};

export function ConditionCard({ condition }: Props) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        marginBottom: 8,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          width: '100%',
          minHeight: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--text-primary)',
        }}
      >
        <span
          aria-label={condition.severity}
          style={{
            fontSize: 18,
            color: SEVERITY_COLOR[condition.severity],
            flexShrink: 0,
            width: 20,
            textAlign: 'center',
          }}
        >
          {SEVERITY_GLYPH[condition.severity]}
        </span>
        <span
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: expanded ? 'normal' : 'nowrap',
          }}
        >
          {condition.name}
        </span>
        {condition.tags && condition.tags.length > 0 && (
          <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {condition.tags.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 999,
                  minWidth: 60,
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                }}
              >
                {t}
              </span>
            ))}
          </span>
        )}
      </button>
      {expanded && (
        <div style={{ padding: '0 14px 14px', display: 'grid', gap: 10, fontSize: 13 }}>
          {condition.symptoms && (
            <div>
              <strong style={{ color: 'var(--text-secondary)' }}>Symptoms:</strong>{' '}
              {condition.symptoms}
            </div>
          )}
          {condition.remedy && (
            <div>
              <strong style={{ color: 'var(--text-secondary)' }}>Remedy:</strong>{' '}
              {condition.remedy}
            </div>
          )}
          {condition.prevention && (
            <div>
              <strong style={{ color: 'var(--text-secondary)' }}>Prevention:</strong>{' '}
              {condition.prevention}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
