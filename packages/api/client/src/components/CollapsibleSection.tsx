import { useState, type ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
  defaultCollapsed?: boolean;
  /** Optional decoration shown right of the title (e.g., chips/badges). */
  headerSlot?: ReactNode;
}

export function CollapsibleSection({
  title,
  children,
  defaultCollapsed = false,
  headerSlot,
}: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const expanded = !collapsed;
  return (
    <div
      className="card"
      style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={expanded}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '12px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--text-primary)',
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease-in-out',
              fontSize: 12,
              opacity: 0.6,
            }}
          >
            ▶
          </span>
          {title}
        </span>
        {headerSlot}
      </button>
      {expanded && <div style={{ padding: '0 16px 16px' }}>{children}</div>}
    </div>
  );
}
