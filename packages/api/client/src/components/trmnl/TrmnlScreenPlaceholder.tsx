/**
 * TrmnlScreenPlaceholder — Storybook-only placeholder for the TRMNL e-ink
 * rendering surface. Renders a labelled, bordered box at the device's native
 * pixel dimensions. Used as a stand-in until the Storybook ↔ TRMNL design
 * bridge (issue #197) lands and real Liquid-rendered stories replace it.
 *
 * Intentionally not exported anywhere outside `*.stories.tsx`. If a third
 * surface ever uses this component, it's time to either (a) extend it into
 * a real component with tests, or (b) delete it because the bridge has shipped.
 *
 * @legacy bridge-pending — see #197
 */
export interface TrmnlScreenPlaceholderProps {
  width: number;
  height: number;
  device: 'OG' | 'X';
  /** Number of grey levels the device renders. OG = 4 (1-bit dithered), X = 16. */
  grayscale: 4 | 16;
  /** Issue ref to point readers at, e.g. "#197". */
  issueRef: string;
}

export function TrmnlScreenPlaceholder({
  width,
  height,
  device,
  grayscale,
  issueRef,
}: TrmnlScreenPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={`TRMNL ${device} screen placeholder, ${width} by ${height}, ${grayscale}-grey. Design pending — see ${issueRef}.`}
      style={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: 'var(--bg)',
        color: 'var(--ink)',
        border: '2px dashed var(--rule)',
        fontFamily: 'var(--font-serif)',
        textAlign: 'center',
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          letterSpacing: '0.02em',
        }}
      >
        TRMNL {device}
      </div>
      <div style={{ fontSize: 16, color: 'var(--ink-2)' }}>
        {width} × {height} · {grayscale}-grey
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink-2)', fontStyle: 'italic' }}>
        Design pending — see issue {issueRef}
      </div>
    </div>
  );
}
