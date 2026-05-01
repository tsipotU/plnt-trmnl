import type { Meta, StoryObj } from '@storybook/react-vite';
import { Callout } from './Callout';

const meta: Meta<typeof Callout> = {
  title: 'Molecules/Callout',
  component: Callout,
  parameters: {
    docs: {
      description: {
        component:
          'Left-bordered serif callout. Lighter than InfoCard (no full border, no header), louder than running text. Use for inline guidance on form pages and explanatory side-notes.',
      },
    },
  },
  argTypes: {
    tone: { control: { type: 'inline-radio' }, options: ['neutral', 'info', 'warn', 'accent'] },
  },
  args: {
    tone: 'neutral',
    children: <><strong>Why this design?</strong> p7l never sees your AI key. You paste the prompt into your tool of choice and it pings p7l on a schedule.</>,
  },
};
export default meta;

type Story = StoryObj<typeof Callout>;

export const Default: Story = {};

export const AllTones: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', maxWidth: 460 }}>
      <Callout tone="neutral">
        That's it. No streaks, no badges, no "you're doing great!". If you ignore the digest, p7l won't escalate.
      </Callout>
      <Callout tone="info">
        Enter this code on your TRMNL device. The pairing window stays open for 10 minutes.
      </Callout>
      <Callout tone="warn">
        Heating season — watering frequency is bumped 30% until 2026-04-15.
      </Callout>
      <Callout tone="accent">
        ✨ When you save, p7l will auto-fill light, conditions, and care notes from a connected AI tool.
      </Callout>
    </div>
  ),
};
