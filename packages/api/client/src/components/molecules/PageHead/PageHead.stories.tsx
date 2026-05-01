import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageHead } from './PageHead';

const meta: Meta<typeof PageHead> = {
  title: 'Molecules/PageHead',
  component: PageHead,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Page header with eyebrow + display title + italic-serif subtitle. Two sizes: **lg** (30px, primary screens) and **sm** (24px, nested screens like Memorial, About). Use `solo` for screens that don\'t have a TopBar above.',
      },
    },
  },
  argTypes: {
    size: { control: { type: 'inline-radio' }, options: ['lg', 'sm'] },
    solo: { control: 'boolean' },
  },
  args: {
    eyebrow: '2026·05·04 · Mon',
    title: 'Today',
    subtitle: '2 thirsty, 9 total.',
    size: 'lg',
    solo: false,
  },
};
export default meta;

type Story = StoryObj<typeof PageHead>;

export const Default: Story = {};

export const NoSubtitle: Story = {
  args: { eyebrow: 'Registry · 9 active', title: 'Plants', subtitle: undefined },
};

export const SmallNested: Story = {
  args: {
    eyebrow: 'AI tool',
    title: 'AI setup prompt',
    subtitle: "Copy this prompt into a scheduled task in Claude, ChatGPT, Cursor, n8n, etc. p7l doesn't ship its own AI — bring your own.",
    size: 'sm',
  },
};

export const Solo: Story = {
  args: {
    eyebrow: 'Care schedule',
    title: 'Calendar',
    subtitle: 'Forecast and history',
    solo: true,
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
      <PageHead
        eyebrow="Bugs · ideas · praise"
        title="Feedback"
        subtitle="All feedback is public to all instance users."
      />
      <div style={{ padding: 'var(--sp-6) var(--sp-5)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink-2)', fontSize: 14 }}>
        (filter rail + list rows go here)
      </div>
    </div>
  ),
};
