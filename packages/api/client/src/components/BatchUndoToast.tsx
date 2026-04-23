import { useEffect, useRef, useState } from 'react';

interface Props {
  batchId: string;
  plantCount: number;
  onUndone: () => void;
  onDismiss: () => void;
}

/**
 * Non-blocking toast that appears after a batch-water and gives the user 15
 * seconds to restore the whole batch via POST /api/plants/undo-batch.
 * Auto-dismisses when the timer hits zero.
 */
export function BatchUndoToast({ batchId, plantCount, onUndone, onDismiss }: Props) {
  const [remaining, setRemaining] = useState(15);
  const [submitting, setSubmitting] = useState(false);

  // Hold the latest onDismiss in a ref so the timer effect can run exactly
  // once per mount without restarting when the parent passes a fresh arrow.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          onDismissRef.current();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleUndo() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/plants/undo-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_id: batchId }),
      });
      if (res.ok) {
        onUndone();
      } else {
        onDismiss();
      }
    } catch {
      onDismiss();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="batch-undo-toast"
      role="status"
      style={{
        position: 'fixed',
        bottom: 96, // clear the floating Add button
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--bg-card)',
        padding: '0.75rem 1rem',
        borderRadius: 8,
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        zIndex: 200,
      }}
    >
      <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>
        Watered {plantCount} {plantCount === 1 ? 'plant' : 'plants'}
      </span>
      <button
        onClick={handleUndo}
        disabled={submitting}
        style={{
          minHeight: 44,
          padding: '0.5rem 0.9rem',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          fontSize: 14,
          fontWeight: 600,
          opacity: submitting ? 0.6 : 1,
        }}
      >
        Undo ({remaining}s)
      </button>
    </div>
  );
}
