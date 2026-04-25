import { useState } from 'react';

/**
 * Pot-size guidance for AddPlant (#129). Same popover affordance as
 * LightLevelTooltip — we don't share the implementation today; refactor when a
 * third surface needs the same pattern.
 */
export function PotSizeTooltip() {
  const [isOpen, setIsOpen] = useState(false);

  const guides = [
    {
      label: 'Small (~8–14 cm)',
      body: 'A spread hand from fingertip to thumbtip, edge-to-edge across the pot rim.',
    },
    {
      label: 'Medium (~14–20 cm)',
      body: 'About one-and-a-half spread hands across.',
    },
    {
      label: 'Large (~20–25 cm)',
      body: 'Two spread hands across.',
    },
    {
      label: 'Extra large (25 cm+)',
      body: 'Wider than two spread hands.',
    },
  ];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Help: how to estimate pot diameter"
        title="Pot diameter guide"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          fontSize: 16,
          padding: '0 8px',
          cursor: 'pointer',
          minHeight: 'auto',
          minWidth: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ⓘ
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 8,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 16,
            zIndex: 1000,
            minWidth: 280,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: 20,
              cursor: 'pointer',
              padding: '4px 8px',
              minHeight: 'auto',
              minWidth: 'auto',
            }}
          >
            ×
          </button>
          <div style={{ paddingRight: 24 }}>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                marginBottom: 12,
                fontStyle: 'italic',
              }}
            >
              Measure across the top of the pot, edge to edge.
            </p>
            {guides.map((g, i) => (
              <div key={g.label} style={{ marginBottom: i < guides.length - 1 ? 12 : 0 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 4,
                  }}
                >
                  {g.label}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{g.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
