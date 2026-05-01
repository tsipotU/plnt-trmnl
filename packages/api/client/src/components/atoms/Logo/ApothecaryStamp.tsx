import type { SVGAttributes } from 'react';

export interface ApothecaryStampProps extends Omit<SVGAttributes<SVGSVGElement>, 'children'> {
  /** Pixel size of the stamp (square). Below 36 the microtext stops being legible — drop the variant in that case. */
  size?: number;
  /** Stroke + text color. Defaults to currentColor. */
  color?: string;
  /** Leaf accent. Defaults to var(--highlight); pass `currentColor` for a fully mono variant. */
  accent?: string;
  /** Drop the curved microtext (useful for the favicon-style variant). */
  microtextOff?: boolean;
}

/* The ceremonial mark. Hero use only — splash, archive (memorial), app icon, formal correspondence.
   The leaf uses --highlight on bone or charcoal; pass accent="currentColor" on colored backgrounds
   so it disappears into ink. */
export function ApothecaryStamp({
  size = 220,
  color = 'currentColor',
  accent = 'var(--highlight)',
  microtextOff = false,
  ...rest
}: ApothecaryStampProps) {
  return (
    <svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      role="img"
      aria-label="p7l apothecary stamp"
      {...rest}
    >
      <defs>
        <path id="ap-circ-top" d="M 120,120 m -94,0 a 94,94 0 1,1 188,0" />
        <path
          id="ap-circ-bot"
          d="M 120,120 m -94,0 a 94,94 0 1,0 188,0"
          transform="rotate(0 120 120)"
        />
      </defs>
      <circle cx="120" cy="120" r="110" fill="none" stroke={color} strokeWidth="1.75" />
      <circle cx="120" cy="120" r="100" fill="none" stroke={color} strokeWidth="0.6" />
      {!microtextOff && (
        <>
          <text
            fontFamily='"Source Serif 4", Georgia, serif'
            fontStyle="italic"
            fontSize="11"
            letterSpacing="3.5"
            fill={color}
          >
            <textPath href="#ap-circ-top" startOffset="50%" textAnchor="middle">
              plnt · trmnl · houseplant care
            </textPath>
          </text>
          <circle cx="20" cy="120" r="1.6" fill={color} />
          <circle cx="220" cy="120" r="1.6" fill={color} />
          <text
            fontFamily='"Source Serif 4", Georgia, serif'
            fontStyle="italic"
            fontSize="11"
            letterSpacing="3.5"
            fill={color}
          >
            <textPath href="#ap-circ-bot" startOffset="50%" textAnchor="middle">
              · est · MMXXV ·
            </textPath>
          </text>
        </>
      )}
      <text
        x="120"
        y="138"
        textAnchor="middle"
        fontFamily='"Source Serif 4", Georgia, serif'
        fontWeight="600"
        fontSize="64"
        letterSpacing="-2"
        fill={color}
      >
        p7l
      </text>
      <g transform="translate(120 75)" fill={accent}>
        <path d="M0 0 C -10 -14, 8 -22, 14 -12 C 18 -4, 6 6, 0 0 Z" />
        <path
          d="M0 0 L 10 -10"
          stroke={accent}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>
      {[[120, 16],[120, 224],[16, 120],[224, 120]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2" fill={color} />
      ))}
    </svg>
  );
}
