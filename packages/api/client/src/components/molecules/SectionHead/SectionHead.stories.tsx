import type { Meta, StoryObj } from '@storybook/react-vite';
import { SectionHead } from './SectionHead';
import { Chip } from '../../atoms/Chip/Chip';
import { Button } from '../../atoms/Button/Button';

const meta: Meta<typeof SectionHead> = {
  title: 'Molecules/SectionHead',
  component: SectionHead,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Section divider with mono-eyebrow label and optional right-side action slot. Used between row groups (Today\'s water, Watered today, Next 7 days, Resting, Conditions, Calibration, Settings sections). The action slot is intentionally generic — drop in a `Chip toggleable`, a small `Button`, or a count link.',
      },
    },
  },
  args: {
    label: 'Today\'s water',
  },
};
export default meta;

type Story = StoryObj<typeof SectionHead>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    label: 'Today\'s water',
    action: <Chip toggleable onClick={() => {}}>Water all (3)</Chip>,
  },
};

export const WithButtonAction: Story = {
  args: {
    label: 'Conditions (1)',
    action: <Button variant="ghost" size="sm">+ Add</Button>,
  },
};

export const WithCountTrail: Story = {
  args: {
    label: 'Care log',
    action: (
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.06em',
        color: 'var(--ink-2)',
        textTransform: 'uppercase',
      }}>
        18 entries
      </span>
    ),
  },
};

export const InContext: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ maxWidth: 402, border: '1px solid var(--border)', background: 'var(--bg)' }}>
      <SectionHead label="Today's water" action={<Chip toggleable onClick={() => {}}>Water all (3)</Chip>} />
      <div style={{ padding: '40px 18px', fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink-3)', textAlign: 'center', borderBottom: '0.5px solid var(--border)' }}>
        (PlantRow list)
      </div>
      <SectionHead label="Watered today" />
      <div style={{ padding: '40px 18px', fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink-3)', textAlign: 'center', borderBottom: '0.5px solid var(--border)' }}>
        (PlantRow list)
      </div>
      <SectionHead label="Next 7 days" />
      <div style={{ padding: '40px 18px', fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink-3)', textAlign: 'center', borderBottom: '0.5px solid var(--border)' }}>
        (Schedule lines)
      </div>
      <SectionHead label="Resting" />
      <div style={{ padding: '40px 18px', fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink-3)', textAlign: 'center' }}>
        (PlantRow list)
      </div>
    </div>
  ),
};
