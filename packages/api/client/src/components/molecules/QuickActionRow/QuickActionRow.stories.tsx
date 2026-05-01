import type { Meta, StoryObj } from '@storybook/react-vite';
import { QuickActionRow, QuickAction } from './QuickActionRow';
import { Pictogram } from '../../atoms/Pictogram/Pictogram';

const meta: Meta<typeof QuickActionRow> = {
  title: 'Molecules/QuickActionRow',
  component: QuickActionRow,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Equal-column row of icon-and-label action buttons. Used on Plant Detail for the Feed/Prune/Repot/Photo/Note row. Compose with `<QuickAction />` children.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof QuickActionRow>;

export const PlantDetailFive: Story = {
  render: () => (
    <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
      <QuickActionRow>
        <QuickAction icon={<Pictogram name="leaf" size={20} />} label="Feed" />
        <QuickAction icon={<Pictogram name="scissors" size={20} />} label="Prune" />
        <QuickAction icon={<Pictogram name="pot" size={20} />} label="Repot" />
        <QuickAction icon={<Pictogram name="bookmark" size={20} />} label="Photo" />
        <QuickAction icon="✎" label="Note" />
      </QuickActionRow>
    </div>
  ),
};

export const ThreeCol: Story = {
  render: () => (
    <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
      <QuickActionRow cols={3}>
        <QuickAction icon={<Pictogram name="drop" size={20} />} label="Water" />
        <QuickAction icon={<Pictogram name="leaf" size={20} />} label="Mist" />
        <QuickAction icon={<Pictogram name="cal" size={20} />} label="Schedule" />
      </QuickActionRow>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
      <QuickActionRow>
        <QuickAction icon={<Pictogram name="leaf" size={20} />} label="Feed" />
        <QuickAction icon={<Pictogram name="scissors" size={20} />} label="Prune" />
        <QuickAction icon={<Pictogram name="pot" size={20} />} label="Repot" disabled />
        <QuickAction icon={<Pictogram name="bookmark" size={20} />} label="Photo" />
        <QuickAction icon="✎" label="Note" />
      </QuickActionRow>
    </div>
  ),
};
