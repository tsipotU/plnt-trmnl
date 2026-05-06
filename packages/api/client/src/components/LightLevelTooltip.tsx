import { useEffect, useRef, useState } from 'react';

/**
 * Light-level guidance for AddPlant. Mirror of PotSizeTooltip — same fixed-
 * position-with-bounding-rect pattern (#157). The original `position: absolute`
 * got clipped by the form's `overflow-y: auto` on /add; fixed escapes ancestor
 * overflow without a portal, and a viewport clamp keeps the popover on screen
 * at narrow widths.
 *
 * @legacy Pre-catalog scaffolding; new components should compose catalog primitives.
 */
export function LightLevelTooltip() {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  function placeFromTrigger() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 320;
    const margin = 8;
    const maxLeft = window.innerWidth - popoverWidth - margin;
    const left = Math.max(margin, Math.min(rect.left, maxLeft));
    setCoords({ top: rect.bottom + margin, left });
  }

  function open() {
    placeFromTrigger();
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return;
    const handler = () => placeFromTrigger();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [isOpen]);

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? close() : open())}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--ink-2)',
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

      {isOpen && coords && (
        <div
          role="dialog"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 16,
            zIndex: 1000,
            minWidth: 280,
            maxWidth: 'calc(100vw - 16px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          <button
            type="button"
            onClick={close}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'none',
              border: 'none',
              color: 'var(--ink-2)',
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
                    color: 'var(--ink)',
                    marginBottom: 6,
                  }}
                >
                  {item.level}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--ink-2)',
                    marginBottom: 4,
                  }}
                >
                  {item.example}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--ink-2)',
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
