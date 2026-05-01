import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pictogram, ICON_NAMES } from './Pictogram';

const meta: Meta<typeof Pictogram> = {
  title: 'Atoms/Pictogram',
  component: Pictogram,
  parameters: {
    docs: {
      description: {
        component:
          'The mid-century geometric icon set. 24×24 grid, 1.5px stroke, square caps, miter joins. Renders at 16/20/24/32 px. Color follows `currentColor`. Provide `label` for accessible icons; omit for decorative icons (auto-applies `aria-hidden`).',
      },
    },
  },
  argTypes: {
    name: { control: { type: 'select' }, options: ICON_NAMES },
    size: { control: { type: 'inline-radio' }, options: [16, 20, 24, 32] },
    stroke: { control: { type: 'number', min: 0.5, max: 3, step: 0.25 } },
  },
  args: {
    name: 'drop',
    size: 24,
    stroke: 1.5,
    label: 'Water',
  },
};
export default meta;

type Story = StoryObj<typeof Pictogram>;

export const Default: Story = {};

export const TheSet: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-2)',
        padding: 'var(--sp-8)',
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 'var(--sp-6)',
        color: 'var(--ink)',
      }}
    >
      {ICON_NAMES.map((name) => (
        <div
          key={name}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-2)',
            }}
          >
            <Pictogram name={name} label={name} />
          </div>
          <code
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--ink-3)',
            }}
          >
            {name}
          </code>
        </div>
      ))}
    </div>
  ),
};

export const SizeScale: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 32, color: 'var(--ink)' }}>
      {[16, 20, 24, 32].map((s) => (
        <div
          key={s}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
        >
          <Pictogram name="drop" size={s} label={`${s}px water drop`} />
          <code
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}
          >
            {s}
          </code>
        </div>
      ))}
    </div>
  ),
};

export const InContext: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 'var(--sp-3)',
        maxWidth: 540,
      }}
    >
      {[
        ['drop', 'Bright indirect'],
        ['sun', 'When top 5cm dry'],
        ['beaker', 'Free-draining, peat-free'],
        ['thermometer', '18–27°C, no draughts'],
        ['pot', 'Spring, every 2 years'],
        ['cal', 'Cycle 4 of ~5'],
      ].map(([name, label]) => (
        <div
          key={name}
          style={{
            display: 'grid',
            gridTemplateColumns: '24px 1fr',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-2)',
            color: 'var(--ink)',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
          }}
        >
          <span style={{ color: 'var(--ink-2)' }}>
            <Pictogram name={name as never} />
          </span>
          <span>{label}</span>
        </div>
      ))}
    </div>
  ),
};
