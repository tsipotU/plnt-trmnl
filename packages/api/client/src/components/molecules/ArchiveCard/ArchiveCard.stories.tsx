import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArchiveCard } from './ArchiveCard';

const meta: Meta<typeof ArchiveCard> = {
  title: 'Molecules/ArchiveCard',
  component: ArchiveCard,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Archive list entry — leading emoji + name + species + bordered mono stamps + optional italic-serif note. The "memorial" stamp variant inverts to ink-on-paper for plants that died. Renders as a button so the whole card is tappable + keyboard-navigable.',
      },
    },
  },
  args: {
    leadingIcon: '🕊️',
    name: 'Mara',
    species: 'Maranta leuconeura',
    stamps: [
      { label: 'Died', memorial: true },
      { label: '2026-04-04' },
      { label: '412d alive' },
    ],
    note: 'Root rot after the December cold snap. RIP.',
    onClick: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof ArchiveCard>;

export const Memorial: Story = {};

export const GaveAway: Story = {
  args: {
    leadingIcon: '🎁',
    name: 'Penny',
    species: 'Pilea peperomioides',
    stamps: [
      { label: 'Gave away' },
      { label: '2026-03-19' },
      { label: '255d alive' },
    ],
    note: 'Gave to Sara when she moved.',
  },
};

export const Moved: Story = {
  args: {
    leadingIcon: '📦',
    name: 'Vincent',
    species: 'Aloe vera',
    stamps: [
      { label: 'Moved' },
      { label: '2025-11-04' },
      { label: '540d alive' },
    ],
    note: 'Left at the old apartment for the new tenants.',
  },
};

export const NoNote: Story = {
  args: {
    leadingIcon: '🎁',
    name: 'Penny',
    species: 'Pilea peperomioides',
    stamps: [
      { label: 'Gave away' },
      { label: '2026-03-19' },
    ],
    note: undefined,
  },
};

export const ArchiveList: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
      <ArchiveCard
        leadingIcon="🕊️"
        name="Mara"
        species="Maranta leuconeura"
        stamps={[{ label: 'Died', memorial: true }, { label: '2026-04-04' }, { label: '412d alive' }]}
        note="Root rot after the December cold snap. RIP."
      />
      <ArchiveCard
        leadingIcon="🎁"
        name="Penny"
        species="Pilea peperomioides"
        stamps={[{ label: 'Gave away' }, { label: '2026-03-19' }, { label: '255d alive' }]}
        note="Gave to Sara when she moved."
      />
      <ArchiveCard
        leadingIcon="📦"
        name="Vincent"
        species="Aloe vera"
        stamps={[{ label: 'Moved' }, { label: '2025-11-04' }, { label: '540d alive' }]}
        note="Left at the old apartment for the new tenants."
      />
    </div>
  ),
};
