import type { Meta, StoryObj } from '@storybook/react-vite';
import { InfoCard } from './InfoCard';

const meta: Meta<typeof InfoCard> = {
  title: 'Molecules/InfoCard',
  component: InfoCard,
  parameters: {
    docs: {
      description: {
        component:
          'In-flow informational card with optional mono uppercase header and italic-serif body. Five tones: neutral / info / warn / accent / success. Distinct from **Banner** (row-shaped notice) and **Callout** (left-border, no header).',
      },
    },
  },
  argTypes: {
    tone: { control: { type: 'inline-radio' }, options: ['neutral', 'info', 'warn', 'accent', 'success'] },
  },
  args: {
    tone: 'neutral',
    title: 'Watering rhythm',
    children: 'Dialed in at 14 days after 5 cycles. p7l will keep this rhythm and adjust seasonally.',
  },
};
export default meta;

type Story = StoryObj<typeof InfoCard>;

export const Default: Story = {};

export const AllTones: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', maxWidth: 460 }}>
      <InfoCard title="Origin">
        Climbs the trunks of trees in the rainforests of southern Mexico and Panama. Indoors, given a moss pole and bright indirect light, it will remember it is a vine and start to climb.
      </InfoCard>
      <InfoCard tone="info" title="Heads up">
        AI tool hasn't enriched this plant yet. Care details will fill in once it polls.
      </InfoCard>
      <InfoCard tone="accent" title="Why this design">
        p7l never sees your AI key. You paste the prompt into your tool of choice and it pings p7l on a schedule. Privacy and flexibility, both.
      </InfoCard>
      <InfoCard tone="success" title="Resolution">
        Fixed in v0.9.4 — debounced the state update.
      </InfoCard>
      <InfoCard tone="warn" title="Light mismatch">
        Catalog says bright indirect. Currently set to medium. The plant might respond by growing leggy.
      </InfoCard>
    </div>
  ),
};

export const NoHeader: Story = {
  args: {
    title: undefined,
    children: 'p7l is a private plant registry. It keeps a quiet record of every plant in your care — watering, repotting, the occasional funeral.',
  },
};

export const PrinciplesList: Story = {
  args: {
    title: 'Principles',
    children: (
      <>
        · No streaks. No nags. No notifications you'll learn to dismiss.<br />
        · It learns <em>your</em> rhythm, not the internet's average.<br />
        · You own the data. Self-hosted. Single user.<br />
        · The archive remembers everything — including what you lost.
      </>
    ),
  },
};
