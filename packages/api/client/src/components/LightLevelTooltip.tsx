import { useState } from 'react';

export function LightLevelTooltip() {
  const [isOpen, setIsOpen] = useState(false);

  const lightLevels = [
    {
      level: 'Low light',
      example: 'North-facing window, back of the room, or interior corner',
      test: 'Cannot read a book comfortably at noon without a lamp',
    },
    {
      level: 'Medium light',
      example: 'East or west-facing window, near the glass but not in direct sun',
      test: 'Can read a book comfortably at noon without artificial light',
    },
    {
      level: 'Bright (indirect or direct)',
      example: 'South-facing window with several hours of direct sun, or very bright indirect',
      test: 'Very bright and warm, shadows are sharp and dark',
    },
  ];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
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
        aria-label="Light level help"
        title="Light level guide"
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
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: 20,
              cursor: 'pointer',
              minHeight: 'auto',
              minWidth: 'auto',
              padding: '4px 8px',
            }}
            aria-label="Close"
          >
            ×
          </button>

          <div style={{ paddingRight: 24 }}>
            {lightLevels.map((item, idx) => (
              <div key={idx} style={{ marginBottom: idx < lightLevels.length - 1 ? 16 : 0 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 6,
                  }}
                >
                  {item.level}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    marginBottom: 4,
                  }}
                >
                  {item.example}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic',
                  }}
                >
                  {item.test}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
