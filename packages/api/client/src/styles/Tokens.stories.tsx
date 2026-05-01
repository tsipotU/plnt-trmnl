import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';

const meta: Meta = {
  title: 'Foundations/Tokens',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The canonical token layer for the p7l design system. Every component consumes these CSS variables; raw scales (bone-*, sage-*, copper-*, slate-*, charcoal-*) are wired into semantic tokens (--bg, --ink, --accent, ...) which flip with [data-theme="dark"].',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

const eyebrow: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-eyebrow)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
  marginBottom: 'var(--sp-3)',
};
const sectionTitle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'var(--text-headline)',
  fontWeight: 500,
  letterSpacing: '-0.01em',
  margin: '0 0 var(--sp-2)',
  color: 'var(--ink)',
};
const sectionSub: CSSProperties = {
  fontSize: 'var(--text-caption)',
  color: 'var(--ink-2)',
  marginBottom: 'var(--sp-6)',
  maxWidth: 640,
};
const sectionWrap: CSSProperties = {
  marginBottom: 'var(--sp-12)',
};

function Swatch({ token, size = 88 }: { token: string; size?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          width: '100%',
          height: size,
          background: `var(${token})`,
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-2)',
        }}
      />
      <code
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--ink-2)',
        }}
      >
        {token}
      </code>
    </div>
  );
}

const SCALES: Array<[string, string[]]> = [
  ['Bone',   ['--bone-50','--bone-100','--bone-200','--bone-300','--bone-400','--bone-500']],
  ['Sage',   ['--sage-50','--sage-100','--sage-200','--sage-300','--sage-400','--sage-500','--sage-600','--sage-700','--sage-800','--sage-900']],
  ['Slate',  ['--slate-50','--slate-100','--slate-200','--slate-300','--slate-400','--slate-500','--slate-600','--slate-700','--slate-800','--slate-900']],
  ['Copper', ['--copper-50','--copper-100','--copper-200','--copper-300','--copper-400','--copper-500','--copper-600','--copper-700']],
  ['Charcoal', ['--charcoal-50','--charcoal-100','--charcoal-200','--charcoal-300','--charcoal-400','--charcoal-500','--charcoal-600']],
];

const SEMANTIC: Array<[string, string]> = [
  ['--bg', 'Page background'],
  ['--bg-elevated', 'Cards, modals'],
  ['--bg-sunken', 'Sidebar, secondary regions'],
  ['--surface', 'Filled chips, hovered rows'],
  ['--border', 'Default 1px borders'],
  ['--rule', 'Hairline horizontal dividers'],
  ['--ink', 'Body and headings'],
  ['--ink-2', 'Secondary, captions'],
  ['--ink-3', 'Tertiary, microtype'],
  ['--accent', 'Primary action (water, save, confirm)'],
  ['--highlight', 'Ceremonial accent (rare)'],
  ['--status-due', 'Watering due today'],
  ['--status-overdue', 'Watering overdue'],
  ['--status-dormant', 'Dormant'],
  ['--status-healthy', 'Healthy / dialed-in'],
];

const TYPE_SCALE: Array<{ name: string; size: string; family: 'display' | 'sans' | 'mono'; weight: number; sample: string }> = [
  { name: 'Display',  size: 'var(--text-display)',  family: 'display', weight: 500, sample: 'Calathea ornata' },
  { name: 'Title',    size: 'var(--text-title)',    family: 'display', weight: 500, sample: 'Calathea ornata' },
  { name: 'Headline', size: 'var(--text-headline)', family: 'display', weight: 500, sample: 'Calathea ornata' },
  { name: 'Subhead',  size: 'var(--text-subhead)',  family: 'display', weight: 500, sample: 'Calathea ornata' },
  { name: 'Body Lg',  size: 'var(--text-body-lg)',  family: 'sans',    weight: 400, sample: 'A pristine, modern interpretation of the home apothecary.' },
  { name: 'Body',     size: 'var(--text-body)',     family: 'sans',    weight: 400, sample: 'A pristine, modern interpretation of the home apothecary.' },
  { name: 'Caption',  size: 'var(--text-caption)',  family: 'sans',    weight: 400, sample: 'Watered 2026-04-14 · Next ~21d' },
  { name: 'Eyebrow',  size: 'var(--text-eyebrow)',  family: 'mono',    weight: 500, sample: 'plnt · trmnl · catalog' },
];

const SPACING = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20];
const RADII: Array<[string, number | 'pill']> = [
  ['--r-0', 0],
  ['--r-1', 2],
  ['--r-2', 4],
  ['--r-3', 8],
  ['--r-pill', 'pill'],
];
const SHADOWS = ['--shadow-1', '--shadow-2', '--shadow-3'];

export const Foundations: Story = {
  render: () => (
    <div style={{ padding: 'var(--sp-12)', maxWidth: 1100, fontFamily: 'var(--font-sans)' }}>
      <div style={eyebrow}>p7l · v0.1</div>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-title)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          margin: '0 0 var(--sp-5)',
          color: 'var(--ink)',
        }}
      >
        Foundations
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--text-body-lg)',
          lineHeight: 1.55,
          color: 'var(--ink-2)',
          maxWidth: 680,
          marginBottom: 'var(--sp-12)',
        }}
      >
        The token catalog that every component composes from. Use the theme toolbar above to
        flip light/dark and verify components stay legible in both.
      </p>

      <section style={sectionWrap}>
        <h2 style={sectionTitle}>Color · raw scales</h2>
        <p style={sectionSub}>Hand-tuned scales. Don't reference these directly from components — use the semantic tokens below.</p>
        {SCALES.map(([name, tokens]) => (
          <div key={name} style={{ marginBottom: 'var(--sp-6)' }}>
            <div style={{ ...eyebrow, marginBottom: 'var(--sp-2)' }}>{name}</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${tokens.length}, 1fr)`,
                gap: 'var(--sp-3)',
              }}
            >
              {tokens.map((t) => <Swatch key={t} token={t} />)}
            </div>
          </div>
        ))}
      </section>

      <section style={sectionWrap}>
        <h2 style={sectionTitle}>Color · semantic tokens</h2>
        <p style={sectionSub}>What components consume. These flip with the theme.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-3)' }}>
          {SEMANTIC.map(([token, use]) => (
            <div
              key={token}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-3)',
                padding: 'var(--sp-3)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-2)',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  background: `var(${token})`,
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-1)',
                  flexShrink: 0,
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)' }}>{token}</code>
                <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{use}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionWrap}>
        <h2 style={sectionTitle}>Type</h2>
        <p style={sectionSub}>Fraunces (display) · Source Serif 4 (serif body) · Inter Tight (UI) · JetBrains Mono (data + eyebrows).</p>
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-2)',
            padding: 'var(--sp-6) var(--sp-8)',
          }}
        >
          {TYPE_SCALE.map(({ name, size, family, weight, sample }) => (
            <div
              key={name}
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr',
                alignItems: 'baseline',
                padding: '14px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                {name}
              </code>
              <div
                style={{
                  fontFamily: family === 'display' ? 'var(--font-display)' : family === 'mono' ? 'var(--font-mono)' : 'var(--font-sans)',
                  fontSize: size,
                  fontWeight: weight,
                  letterSpacing: name === 'Display' || name === 'Title' ? '-0.02em' : 'normal',
                  textTransform: name === 'Eyebrow' ? 'uppercase' : 'none',
                  lineHeight: 1.1,
                  color: 'var(--ink)',
                }}
              >
                {sample}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionWrap}>
        <h2 style={sectionTitle}>Spacing</h2>
        <p style={sectionSub}>4-step scale. Multiples of 4. <code>--sp-1</code> through <code>--sp-20</code>.</p>
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-2)', padding: 'var(--sp-6)' }}>
          {SPACING.map((n) => {
            const px = ({ 1:4, 2:8, 3:12, 4:16, 5:20, 6:24, 8:32, 10:40, 12:48, 16:64, 20:80 } as Record<number, number>)[n];
            return (
              <div key={n} style={{ display: 'grid', gridTemplateColumns: '120px 80px 1fr', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)' }}>--sp-{n}</code>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>{px}px</span>
                <div style={{ height: 16, width: px, background: 'var(--accent)' }} />
              </div>
            );
          })}
        </div>
      </section>

      <section style={sectionWrap}>
        <h2 style={sectionTitle}>Radius</h2>
        <p style={sectionSub}>Restrained. Big radii feel wrong on Scandinavian apothecary surfaces.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--sp-3)' }}>
          {RADII.map(([token, val]) => (
            <div key={token} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-2)', padding: 'var(--sp-5)' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: val === 'pill' ? 9999 : `${val}px`,
                  margin: '0 auto var(--sp-3)',
                }}
              />
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)' }}>{token}</code>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{val === 'pill' ? 'pill' : `${val}px`}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionWrap}>
        <h2 style={sectionTitle}>Elevation</h2>
        <p style={sectionSub}>Three soft shadow steps. Always paired with a 1px hairline so the edge stays crisp.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-4)' }}>
          {SHADOWS.map((s) => (
            <div key={s} style={{ background: 'var(--bg-sunken)', padding: 'var(--sp-8)', borderRadius: 'var(--r-2)' }}>
              <div
                style={{
                  height: 110,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-2)',
                  boxShadow: `var(${s})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--ink-2)',
                }}
              >
                {s}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  ),
};
