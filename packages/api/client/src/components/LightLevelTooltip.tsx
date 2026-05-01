/** @legacy Pre-catalog scaffolding; new components should compose catalog primitives. */
import { useState } from 'react';

export function LightLevelTooltip() {
  const [isOpen, setIsOpen] = useState(false);

  const lightLevels = [
    {
      level: 'Low',
      example: 'North-facing window, back of the room, or interior corner',
      test: 'Cannot read a book comfortably at noon without a lamp',
    },
    {
      level: 'Medium',
      example: 'East or west-facing window, near the glass but not in direct sun',
      test: 'Can read a book comfortably at noon without artificial light',
    },
    {
      level: 'Bright indirect',
      example: 'Sunny room, plant near a window but out of the sun’s direct path',
      test: 'Very bright but the sun does not actually touch the leaves',
    },
    {
      level: 'Direct',
      example: 'South or west-facing window with sun landing on the plant',
      test: 'Sun touches the leaves for 3+ hours a day',
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
