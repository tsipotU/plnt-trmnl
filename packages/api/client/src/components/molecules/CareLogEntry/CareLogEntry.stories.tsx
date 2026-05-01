import type { Meta, StoryObj } from '@storybook/react-vite';
import { CareLogEntry } from './CareLogEntry';
import { Pictogram } from '../../atoms/Pictogram/Pictogram';

const meta: Meta<typeof CareLogEntry> = {
  title: 'Molecules/CareLogEntry',
  component: CareLogEntry,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          "Single entry in a plant's care log. Two-column grid: mono date · type with optional icon and italic-serif note. Stack vertically inside a list container; the parent handles the surrounding padding.",
      },
    },
  },
  args: {
    date: '2026-04-28',
    type: 'watered',
    icon: <Pictogram name="drop" size={14} />,
  },
};
export default meta;

type Story = StoryObj<typeof CareLogEntry>;

export const Default: Story = {};

export const WithNote: Story = {
  args: {
    date: '2026-04-13',
    type: 'fertilized',
    icon: <Pictogram name="leaf" size={14} />,
    note: 'Spring feed — diluted Pokon at half strength.',
  },
};

export const Timeline: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ maxWidth: 402, padding: '0 18px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
      <CareLogEntry date="2026-04-28" type="watered" icon={<Pictogram name="drop" size={14} />} />
      <CareLogEntry
        date="2026-04-13"
        type="fertilized"
        icon={<Pictogram name="leaf" size={14} />}
        note="Spring feed — diluted Pokon at half strength."
      />
      <CareLogEntry date="2026-04-21" type="watered" icon={<Pictogram name="drop" size={14} />} />
      <CareLogEntry
        date="2026-04-19"
        type="note"
        icon="✎"
        note="New aerial root pushing out near the trellis."
      />
      <CareLogEntry date="2026-04-14" type="watered" icon={<Pictogram name="drop" size={14} />} />
      <CareLogEntry
        date="2026-04-08"
        type="calibration"
        icon={<Pictogram name="graph" size={14} />}
        note="Soil dry: cycle from 9d → 7d."
      />
    </div>
  ),
};
