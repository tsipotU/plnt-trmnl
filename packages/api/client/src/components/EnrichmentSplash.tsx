/**
 * Post-add enrichment splash (issue #72).
 *
 * @legacy Pre-catalog scaffolding; new components should compose catalog primitives.
 *
 * Shown after POST /api/plants succeeds and enrichment completes, BEFORE the
 * user lands on the plant detail page. Surfaces the enriched species +
 * preview illustration + summary care so misidentifications ("Sanseveria" →
 * Sansevieria) are caught before they propagate.
 *
 * State machine managed by AddPlant — this component is presentational:
 *   - mode="enriching"   → loading spinner (waiting on callback)
 *   - mode="success"     → species + image + summary + Looks right / Not quite
 *   - mode="correcting"  → text input + Submit correction
 *
 * The #39 did-you-mean flow is delegated (separate component) — not handled
 * here. Failure path shows DidYouMeanSplash in AddPlant.
 */

import { useState } from 'react';

export interface EnrichmentSplashPreview {
  species: string | null;
  /** illustration_path as stored on the plant row (relative path or URL). */
  illustrationPath: string | null;
  /** 'low' | 'medium' | 'bright_indirect' | 'direct' — plant's effective light preference. */
  lightLevel: string | null;
  /** Pre-formatted water frequency string (e.g. "Every 7 days"). */
  waterFrequency: string | null;
  /** Single-line placement hint (catalog first-tip, or null if none). */
  placementHint: string | null;
}

type Mode = 'enriching' | 'success' | 'correcting' | 'no-match';

interface EnrichmentSplashProps {
  mode: Mode;
  typedName: string;
  preview: EnrichmentSplashPreview | null;
  onLooksRight: () => void;
  onNotQuite: () => void;
  onSubmitCorrection: (correctedName: string) => void;
  onCancelCorrection: () => void;
  submitting: boolean;
}

const LIGHT_LABELS: Record<string, string> = {
  low: 'Low light',
  medium: 'Medium light',
  bright_indirect: 'Bright indirect',
  direct: 'Direct sun',
};

function formatLight(level: string | null): string | null {
  if (!level) return null;
  return LIGHT_LABELS[level] ?? level;
}

export function EnrichmentSplash({
  mode,
  typedName,
  preview,
  onLooksRight,
  onNotQuite,
  onSubmitCorrection,
  onCancelCorrection,
  submitting,
}: EnrichmentSplashProps) {
  const [correctionDraft, setCorrectionDraft] = useState('');

  if (mode === 'enriching') {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60dvh',
          gap: 16,
          textAlign: 'center',
          padding: '0 16px',
        }}
      >
        <div style={{ fontSize: 48 }} aria-hidden="true">✨</div>
        <p style={{ fontSize: 18, fontWeight: 600 }}>Enriching {typedName}…</p>
        <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>
          Refining care details — this usually takes a few seconds
        </p>
      </div>
    );
  }

  if (mode === 'correcting') {
    const trimmed = correctionDraft.trim();
    return (
      <div
        role="dialog"
        aria-labelledby="splash-correct-title"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          minHeight: '60dvh',
          gap: 16,
          padding: '24px 16px',
        }}
      >
        <p id="splash-correct-title" style={{ fontSize: 18, fontWeight: 600, textAlign: 'center' }}>
          What&rsquo;s the correct species?
        </p>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', textAlign: 'center' }}>
          Type the plant&rsquo;s name — we&rsquo;ll re-run enrichment.
        </p>
        <input
          type="text"
          aria-label="Corrected plant name"
          placeholder="e.g. Sansevieria trifasciata"
          value={correctionDraft}
          onChange={(e) => setCorrectionDraft(e.target.value)}
          autoFocus
          style={{ fontSize: 16 }}
        />
        <button
          type="button"
          onClick={() => onSubmitCorrection(trimmed)}
          disabled={submitting || trimmed.length === 0}
          style={{
            width: '100%',
            fontSize: 16,
            fontWeight: 600,
            padding: '12px 0',
            borderRadius: 12,
            opacity: submitting || trimmed.length === 0 ? 0.5 : 1,
          }}
        >
          {submitting ? 'Retrying…' : 'Retry enrichment'}
        </button>
        <button
          type="button"
          onClick={onCancelCorrection}
          disabled={submitting}
          style={{
            width: '100%',
            fontSize: 15,
            fontWeight: 500,
            padding: '12px 0',
            borderRadius: 12,
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--ink)',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (mode === 'no-match') {
    return (
      <div
        role="dialog"
        aria-labelledby="splash-no-match-title"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          minHeight: '60dvh',
          gap: 16,
          padding: '24px 16px',
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: 'var(--ink-2)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textAlign: 'center',
          }}
        >
          We don&rsquo;t have detailed info yet
        </p>
        <h1
          id="splash-no-match-title"
          style={{
            fontSize: 22,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          {typedName}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: 'var(--ink-2)',
            textAlign: 'center',
          }}
        >
          We&rsquo;ll still track your watering and let you log notes. Connect an AI tool in Settings to fill in care details next time.
        </p>
        <button
          type="button"
          onClick={onLooksRight}
          style={{
            width: '100%',
            fontSize: 17,
            fontWeight: 600,
            padding: '14px 0',
            borderRadius: 12,
            marginTop: 4,
          }}
        >
          Continue
        </button>
        <button
          type="button"
          onClick={onNotQuite}
          style={{
            width: '100%',
            fontSize: 15,
            fontWeight: 500,
            padding: '12px 0',
            borderRadius: 12,
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--ink)',
          }}
        >
          Try a different name
        </button>
      </div>
    );
  }

  // mode === 'success'
  const light = formatLight(preview?.lightLevel ?? null);
  const water = preview?.waterFrequency ?? null;
  const placement = preview?.placementHint ?? null;
  const species = preview?.species ?? typedName;

  return (
    <div
      role="dialog"
      aria-labelledby="splash-success-title"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        minHeight: '60dvh',
        gap: 16,
        padding: '16px',
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: 'var(--ink-2)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          textAlign: 'center',
        }}
      >
        We found
      </p>
      <h1
        id="splash-success-title"
        style={{
          fontSize: 24,
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {species}
      </h1>

      {/* Illustration — mirror detail-page resolution pattern */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {preview?.illustrationPath ? (
          <img
            src={`/api/illustrations/${encodeURIComponent(preview.illustrationPath)}`}
            alt={species ?? 'Plant illustration'}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <span style={{ fontSize: 80 }} aria-hidden="true">🌿</span>
        )}
      </div>

      {/* Summary care — one line per dimension */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {light && (
          <div style={{ display: 'flex', gap: 8, fontSize: 14 }}>
            <span style={{ color: 'var(--ink-2)', minWidth: 80 }}>Light</span>
            <span style={{ color: 'var(--ink)' }}>{light}</span>
          </div>
        )}
        {water && (
          <div style={{ display: 'flex', gap: 8, fontSize: 14 }}>
            <span style={{ color: 'var(--ink-2)', minWidth: 80 }}>Water</span>
            <span style={{ color: 'var(--ink)' }}>{water}</span>
          </div>
        )}
        {placement && (
          <div style={{ display: 'flex', gap: 8, fontSize: 14 }}>
            <span style={{ color: 'var(--ink-2)', minWidth: 80 }}>Placement</span>
            <span style={{ color: 'var(--ink)' }}>{placement}</span>
          </div>
        )}
        {!light && !water && !placement && (
          <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
            Care summary unavailable — full profile loading on the next screen.
          </p>
        )}
      </div>

      {/* Primary action — confirm match */}
      <button
        type="button"
        onClick={onLooksRight}
        style={{
          width: '100%',
          fontSize: 17,
          fontWeight: 600,
          padding: '14px 0',
          borderRadius: 12,
          marginTop: 4,
        }}
      >
        Looks right
      </button>

      {/* Secondary action — dispute and correct */}
      <button
        type="button"
        onClick={onNotQuite}
        style={{
          width: '100%',
          fontSize: 15,
          fontWeight: 500,
          padding: '12px 0',
          borderRadius: 12,
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--ink)',
        }}
      >
        Not quite
      </button>
    </div>
  );
}
