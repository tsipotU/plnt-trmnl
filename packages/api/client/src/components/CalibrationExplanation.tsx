/** @legacy Pre-catalog scaffolding; new components should compose catalog primitives. */
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'calibration-explanation-seen';

interface Props {
  /** Optional override for tests. */
  initialOpen?: boolean;
}

export function CalibrationExplanation({ initialOpen = false }: Props) {
  const [open, setOpen] = useState(initialOpen);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY) === 'true';
      if (!seen) setPulse(true);
    } catch {
      // localStorage unavailable — skip pulse.
    }
  }, []);

  function handleOpen() {
    setOpen(true);
    setPulse(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Why am I being asked this?"
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          width: 22,
          height: 22,
          minHeight: 22,
          padding: 0,
          borderRadius: '50%',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          animation: pulse ? 'calibration-pulse 1.4s ease-in-out 2' : undefined,
        }}
      >
        ?
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Why am I being asked this?"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            className="card"
            style={{ maxWidth: 420, padding: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
              Why am I being asked this?
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Published care data is a starting guess. Your home is unique. These quick
              taps help plnt-trmnl learn when YOUR plant actually wants water.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ width: '100%' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes calibration-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 168, 107, 0.6); }
          50% { box-shadow: 0 0 0 6px rgba(0, 168, 107, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes calibration-pulse { 0%, 100% { box-shadow: none; } }
        }
      `}</style>
    </>
  );
}
