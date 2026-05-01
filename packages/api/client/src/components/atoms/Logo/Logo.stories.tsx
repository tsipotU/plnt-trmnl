import type { Meta, StoryObj } from '@storybook/react-vite';
import { Wordmark } from './Wordmark';
import { ApothecaryStamp } from './ApothecaryStamp';
import { Lockup } from './Lockup';

const meta: Meta = {
  title: 'Atoms/Logo',
  parameters: {
    docs: {
      description: {
        component:
          'Three logo atoms: **Wordmark** (the daily driver, header use), **ApothecaryStamp** (ceremonial — splash, archive, app icon), and **Lockup** (stamp + wordmark + descriptor, sparingly). Don\'t recolor the wordmark, don\'t rotate the stamp, don\'t scale the stamp below 36px (microtext stops being legible).',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

const specimen = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-2)',
  padding: 'var(--sp-8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 240,
  position: 'relative' as const,
};

export const WordmarkSizes: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--sp-4)',
        color: 'var(--ink)',
      }}
    >
      {[96, 48, 24, 16].map((s) => (
        <div key={s} style={{ ...specimen, minHeight: 140 }}>
          <Wordmark size={s} />
        </div>
      ))}
    </div>
  ),
};

export const StampPrimary: Story = {
  render: () => (
    <div style={{ ...specimen, color: 'var(--ink)' }}>
      <ApothecaryStamp size={240} accent="var(--highlight)" />
    </div>
  ),
};

export const StampVariants: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--sp-4)',
      }}
    >
      <div style={{ ...specimen, color: 'var(--ink)' }}>
        <ApothecaryStamp size={140} accent="currentColor" />
      </div>
      <div style={{ ...specimen, background: 'var(--charcoal-500)', color: 'var(--bone-50)' }}>
        <ApothecaryStamp size={140} color="var(--bone-50)" accent="var(--copper-300)" />
      </div>
      <div style={{ ...specimen, color: 'var(--ink)' }}>
        <ApothecaryStamp size={32} microtextOff accent="currentColor" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'All-ink (mono) · reversed on charcoal · favicon (32px, microtext dropped). The leaf accent only uses copper on bone or charcoal — on colored backgrounds it should disappear into ink.',
      },
    },
  },
};

export const LockupDefault: Story = {
  render: () => (
    <div style={{ ...specimen, color: 'var(--ink)' }}>
      <Lockup />
    </div>
  ),
};

export const AppIcons: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'iOS / Android plates. The stamp lives inside a soft-rect plate of bone, slate, sage, or charcoal, with a 14% safe-area inset. Descriptor microtext is dropped — too small to read at app-icon scale.',
      },
    },
  },
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--sp-3)',
      }}
    >
      {[
        ['Light bone', 'var(--bone-100)', 'var(--ink)', 'var(--copper-400)'],
        ['Dark slate', 'var(--slate-700)', 'var(--bone-100)', 'var(--copper-300)'],
        ['Sage', 'var(--sage-500)', 'var(--bone-50)', 'var(--bone-50)'],
        ['Charcoal', 'var(--charcoal-500)', 'var(--bone-100)', 'var(--copper-300)'],
      ].map(([name, bg, ink, accent]) => (
        <div key={name} style={{ ...specimen, minHeight: 220 }}>
          <div
            style={{
              width: 140,
              height: 140,
              background: bg,
              borderRadius: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-2)',
              color: ink,
            }}
          >
            <ApothecaryStamp size={106} microtextOff color={ink} accent={accent} />
          </div>
        </div>
      ))}
    </div>
  ),
};
