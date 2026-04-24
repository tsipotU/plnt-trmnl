import { useDevInfo } from '../hooks/useDevInfo.js';

export function Settings() {
  const [devInfoEnabled, setDevInfoEnabled] = useDevInfo();

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
