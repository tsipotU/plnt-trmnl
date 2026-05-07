import { useEffect, useRef, useState } from 'react';

/**
 * Pot-size guidance for AddPlant (#129). Same popover affordance as
 * LightLevelTooltip — we don't share the implementation today; refactor when a
 * third surface needs the same pattern.
 *
 * The popover uses `position: fixed` with coords derived from the trigger's
 * bounding rect (#157). The original `position: absolute` got clipped by the
 * form's `overflow-y: auto` on /add — fixed escapes ancestor overflow without
 * needing a portal, and a viewport clamp keeps the popover on screen at narrow
 * widths.
 *
 * @legacy Pre-catalog scaffolding; new components should compose catalog primitives.
 */
export function PotSizeTooltip() {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  function placeFromTrigger() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // Popover is min-width 280, padded; assume ~320 effective width when clamping.
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

  // Reposition on resize / scroll while open so the popover tracks its trigger.
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
        aria-label="Help: how to estimate pot diameter"
        title="Pot diameter guide"
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
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'none',
              border: 'none',
              color: 'var(--ink-2)',
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
                color: 'var(--ink-2)',
                marginBottom: 12,
                fontStyle: 'italic',
              }}
            >
              Pot sizes are absolute (diameter at the rim). The watering schedule uses your pot's volume — bigger pot, more soil, longer interval.
            </p>
            <p
              style={{
                fontSize: 13,
                color: 'var(--ink-2)',
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
                    color: 'var(--ink)',
                    marginBottom: 4,
                  }}
                >
                  {g.label}
                </p>
                <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{g.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
