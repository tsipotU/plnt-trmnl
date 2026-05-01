import type { Meta, StoryObj } from '@storybook/react-vite';
import { BackBar } from './BackBar';

const meta: Meta<typeof BackBar> = {
  title: 'Molecules/BackBar',
  component: BackBar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Sticky bar at the top of nested screens (Plant Detail, Memorial, AI prompt, etc.). Back button + optional eyebrow context + optional right-side actions slot.',
      },
    },
  },
  args: {
    onBack: () => {},
    backLabel: '← Back',
    eyebrow: 'Living room',
  },
};
export default meta;

type Story = StoryObj<typeof BackBar>;

export const Default: Story = {};

export const NamedBack: Story = {
  args: { backLabel: '← Settings', eyebrow: 'About' },
};

export const NoEyebrow: Story = {
  args: { eyebrow: undefined },
};

export const WithActions: Story = {
  args: {
    backLabel: '← Plants',
    eyebrow: 'Living room',
    actions: (
      <button
        type="button"
        title="Archive plant"
        style={{
          background: 'transparent',
          border: '0.5px solid var(--ink)',
          padding: '4px 10px',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          color: 'var(--ink)',
          cursor: 'pointer',
        }}
      >
        ⊘
      </button>
    ),
  },
};

export const InAppShell: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div
      style={{
        background: 'var(--bg)',
        minHeight: 320,
        maxWidth: 402,
        margin: '0 auto',
        border: '1px solid var(--border)',
      }}
    >
      <BackBar onBack={() => {}} backLabel="← Plants" eyebrow="Living room" />
      <div style={{ padding: 'var(--sp-6) var(--sp-5)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink-2)', fontSize: 14 }}>
        (page content — Plant Detail, Memorial, AI Prompt, etc.)
      </div>
    </div>
  ),
};
