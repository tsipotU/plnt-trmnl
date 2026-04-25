import { useState, useEffect } from 'react';
import { CalibrationExplanation } from './CalibrationExplanation';

// --- Types ---

interface CalibrationQuestion {
  id: number;
  plant_id: number;
  question_text: string;
  question_type: string;
  scale_min_label: string;
  scale_max_label: string;
}

interface CalibrationPlant {
  id: number;
  name: string;
  identifier: string | null;
  illustration_path: string | null;
  calibration_cycle: number;
  is_converged: number;
  question: CalibrationQuestion;
}

interface CalibrationResult {
  interval_before: number;
  interval_after: number;
  convergence_event: 'converged' | 'drifted' | null;
}

interface CalibrationModalProps {
  onDone: () => void;
}

// --- Number button row ---

function ScaleButtons({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        justifyContent: 'center',
        margin: '24px 0 8px',
      }}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            fontSize: 20,
            fontWeight: 700,
            background: value === n ? 'var(--accent)' : 'var(--bg-secondary)',
            color: value === n ? 'white' : 'var(--text-secondary)',
            border: value === n ? '2px solid var(--accent)' : '2px solid var(--border)',
            padding: 0,
            flexShrink: 0,
            transition: 'background 0.15s, color 0.15s, border-color 0.15s',
          }}
          aria-pressed={value === n}
          aria-label={`Score ${n}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// --- Single plant calibration screen ---

function PlantCalibrationScreen({
  plant,
  index,
  total,
  onSubmit,
  onSkip,
  onNext,
}: {
  plant: CalibrationPlant;
  index: number;
  total: number;
  onSubmit: (questionId: number, answerValue: number) => Promise<CalibrationResult | null>;
  onSkip: () => void;
  onNext: () => void;
}) {
  const [answer, setAnswer] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    const res = await onSubmit(plant.question.id, answer);
    setResult(res);
    setSubmitted(true);
    setSubmitting(false);
  }

  const intervalChanged =
    result && result.interval_before !== result.interval_after;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 20px',
        minHeight: '100dvh',
        background: 'var(--bg-primary)',
      }}
    >
      {/* Progress */}
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          marginBottom: 24,
          alignSelf: 'flex-start',
        }}
      >
        Plant {index + 1} of {total}
      </div>

      {/* Illustration */}
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {plant.illustration_path ? (
          <img
            src={`/api/illustrations/${encodeURIComponent(plant.illustration_path)}`}
            alt={plant.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <span style={{ fontSize: 48 }}>🌿</span>
        )}
      </div>

      {/* Plant name */}
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginBottom: plant.identifier ? 2 : 8,
          textAlign: 'center',
        }}
      >
        {plant.name}
      </h2>
      {plant.identifier && (
        <div
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          {plant.identifier}
        </div>
      )}

      {/* #60 — calibration progress + explanation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 6,
          fontSize: 13,
          color: 'var(--text-secondary)',
        }}
      >
        <span>Calibration {(plant.calibration_cycle ?? 0) + 1} of ~5</span>
        <CalibrationExplanation />
      </div>

      {/* Question */}
      <p
        style={{
          fontSize: 18,
          textAlign: 'center',
          color: 'var(--text-primary)',
          lineHeight: 1.5,
          marginBottom: 4,
          maxWidth: 300,
        }}
      >
        {plant.question.question_text}
      </p>

      {!submitted ? (
        <>
          {/* Scale buttons */}
          <ScaleButtons value={answer} onChange={setAnswer} />

          {/* Scale labels */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: 320,
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginBottom: 32,
              paddingTop: 4,
            }}
          >
            <span>{plant.question.scale_min_label}</span>
            <span>{plant.question.scale_max_label}</span>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: '100%',
              maxWidth: 320,
              fontSize: 18,
              fontWeight: 700,
              padding: '16px 24px',
              marginBottom: 16,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>

          {/* Skip */}
          <button
            onClick={onSkip}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 14,
              padding: '10px 16px',
              textDecoration: 'underline',
            }}
          >
            Skip (assume 3)
          </button>
        </>
      ) : (
        <>
          {/* Result feedback */}
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius)',
              padding: '20px 24px',
              textAlign: 'center',
              marginTop: 24,
              marginBottom: 32,
              width: '100%',
              maxWidth: 320,
            }}
          >
            {intervalChanged ? (
              <>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    marginBottom: 4,
                  }}
                >
                  {result!.interval_before} → {result!.interval_after} days
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  Interval adjusted
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    marginBottom: 4,
                  }}
                >
                  {result?.interval_before ?? '—'} days
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  Interval unchanged
                </div>
              </>
            )}
            {/* #60 — convergence transition message */}
            {result?.convergence_event === 'converged' && (
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  background: 'var(--accent-muted, rgba(0, 168, 107, 0.15))',
                  borderRadius: 8,
                  fontSize: 14,
                  color: 'var(--accent)',
                }}
              >
                🌿 {plant.name} is dialed in at {result.interval_after} days.
              </div>
            )}
            {result?.convergence_event === 'drifted' && (
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 8,
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                }}
              >
                {plant.name} is drinking differently lately — recalibrating.
              </div>
            )}
          </div>

          {/* Next / Done */}
          <button
            onClick={onNext}
            style={{
              width: '100%',
              maxWidth: 320,
              fontSize: 18,
              fontWeight: 700,
              padding: '16px 24px',
            }}
          >
            {index + 1 < total ? 'Next plant →' : 'Done'}
          </button>
        </>
      )}
    </div>
  );
}

// --- CalibrationModal ---

export function CalibrationModal({ onDone }: CalibrationModalProps) {
  const [plants, setPlants] = useState<CalibrationPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/calibration/due')
      .then((r) => r.json())
      .then((data: CalibrationPlant[]) => {
        setPlants(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  async function handleSubmit(
    questionId: number,
    answerValue: number
  ): Promise<CalibrationResult | null> {
    const plant = plants[currentIndex];
    if (!plant) return null;
    try {
      const res = await fetch(`/api/plants/${plant.id}/calibration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answerValue }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        current_interval: number;
        is_converged: number;
        convergence_event: 'converged' | 'drifted' | null;
        interval_before?: number;
        interval_after?: number;
      };
      return {
        interval_before: data.interval_before ?? data.current_interval,
        interval_after: data.interval_after ?? data.current_interval,
        convergence_event: data.convergence_event,
      };
    } catch {
      return null;
    }
  }

  function handleNext() {
    if (currentIndex + 1 >= plants.length) {
      onDone();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handleSkip() {
    // Skip = dismiss without submitting, treat as answer 3 (no change)
    handleNext();
  }

  // Don't render if: loading, no plants due, or dismissed
  if (loading || dismissed || plants.length === 0) return null;

  const currentPlant = plants[currentIndex];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-primary)',
        zIndex: 100,
        overflowY: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Daily calibration check-in"
    >
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontSize: 22,
          padding: 8,
          zIndex: 101,
        }}
        aria-label="Dismiss calibration"
      >
        ✕
      </button>

      <PlantCalibrationScreen
        key={currentPlant.id}
        plant={currentPlant}
        index={currentIndex}
        total={plants.length}
        onSubmit={handleSubmit}
        onSkip={handleSkip}
        onNext={handleNext}
      />
    </div>
  );
}
