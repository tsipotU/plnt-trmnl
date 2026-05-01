import { ApothecaryStamp } from './ApothecaryStamp';

export interface LockupProps {
  /** Pixel size of the inline stamp. */
  stampSize?: number;
  /** Color for the wordmark + descriptor. Stamp uses the same color. */
  color?: string;
  /** Hide the descriptor microtype below the wordmark. */
  descriptorOff?: boolean;
}

/* Horizontal lockup — apothecary stamp + wordmark + descriptor.
   Use sparingly: app store header, marketing site footer, formal correspondence. */
export function Lockup({
  stampSize = 56,
  color = 'var(--ink)',
  descriptorOff = false,
}: LockupProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, color }}>
      <ApothecaryStamp size={stampSize} accent="var(--highlight)" color={color} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: '-0.03em',
          }}
        >
          p7l
        </span>
        {!descriptorOff && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginTop: 4,
            }}
          >
            plnt · trmnl
          </span>
        )}
      </div>
    </div>
  );
}
