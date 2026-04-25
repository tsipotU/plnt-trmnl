import { useEffect, useState } from 'react';

interface Props {
  plantIds: number[];
  plantNames?: Record<number, string>;
  onComplete: () => void;
}

interface Question {
  plantId: number;
  plantName: string;
  questionId: number;
  questionText: string;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
}

/**
 * Walks a list of plant IDs that were just watered in a batch and prompts a
 * calibration question for each non-converged plant. Converged plants whose
 * backend response includes `{ skip: true }` are silently filtered out. When the
 * queue is exhausted (or empty to begin with) onComplete() is called.
 *
 * Talks to:
 *  - GET /api/plants/:id/calibration/next   -> question or { skip: true }
 *  - POST /api/plants/:id/calibration       -> { questionId, answerValue }
 */
export function CalibrationSequence({ plantIds, plantNames, onComplete }: Props) {
  const [queue, setQueue] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  // #60 — flash a short message after each submit when a convergence transition fires.
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const collected: Question[] = [];
      for (const pid of plantIds) {
        try {
          const res = await fetch(`/api/plants/${pid}/calibration/next`);
          if (!res.ok) continue;
          const data = await res.json();
          if (data.skip) continue;
          if (!data.question_text) continue;
          collected.push({
            plantId: pid,
            plantName: plantNames?.[pid] ?? `#${pid}`,
            questionId: data.id,
            questionText: data.question_text,
            scaleMinLabel: data.scale_min_label ?? null,
            scaleMaxLabel: data.scale_max_label ?? null,
          });
        } catch {
          // Ignore individual fetch failures; skip that plant.
        }
      }
      if (cancelled) return;
      if (collected.length === 0) {
        onComplete();
      } else {
        setQueue(collected);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantIds]);

  if (!queue) return null;
  const current = queue[index];
  if (!current) return null;

  async function submit(value: number) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/plants/${current.plantId}/calibration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: current.questionId, answerValue: value }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          current_interval?: number;
          convergence_event?: 'converged' | 'drifted' | null;
        };
        if (data.convergence_event === 'converged') {
          setFlash(`🌿 ${current.plantName} is dialed in at ${data.current_interval} days.`);
        } else if (data.convergence_event === 'drifted') {
          setFlash(`${current.plantName} is drinking differently lately — recalibrating.`);
        }
      }
    } catch {
      // Swallow — don't block the queue on a single failed submit.
    }
    setSubmitting(false);
    if (index + 1 >= queue.length) onComplete();
    else setIndex(index + 1);
  }

  return (
    <div
      className="calibration-sequence"
      style={{
        background: 'var(--bg-card)',
        borderRadius: 12,
        padding: '1rem',
        marginBottom: 16,
      }}
    >
      {flash && (
        <div
          role="status"
          style={{
            background: 'var(--accent-muted, rgba(0, 168, 107, 0.15))',
            color: 'var(--accent)',
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 13,
            marginBottom: 8,
          }}
        >
          {flash}
        </div>
      )}
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
        {index + 1} of {queue.length}
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
        {current.plantName}
      </h3>
      <p style={{ fontSize: 15, color: 'var(--text-primary)', marginBottom: 12 }}>
        {current.questionText}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: 8 }}>
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            onClick={() => submit(v)}
            disabled={submitting}
            style={{
              minHeight: 44,
              minWidth: 44,
              flex: 1,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: 16,
              fontWeight: 600,
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {v}
          </button>
        ))}
      </div>
      {(current.scaleMinLabel || current.scaleMaxLabel) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          <span>{current.scaleMinLabel ?? ''}</span>
          <span>{current.scaleMaxLabel ?? ''}</span>
        </div>
      )}
    </div>
  );
}
