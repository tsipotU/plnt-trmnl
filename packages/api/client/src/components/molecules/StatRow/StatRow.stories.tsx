import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatRow, Stat } from './StatRow';

const meta: Meta<typeof StatRow> = {
  title: 'Molecules/StatRow',
  component: StatRow,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Equal-column stat strip with hairline borders top + bottom + between cells. Compose with `<Stat />` children. Default 3 columns; pass `cols={2}` or `cols={4}` for plant-detail layouts.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof StatRow>;

export const TodayThree: Story = {
  render: () => (
    <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
      <StatRow>
        <Stat num={2} label="Due" />
        <Stat num={5} label="Dialed in" />
        <Stat num={3} label="Watered" />
      </StatRow>
    </div>
  ),
};

export const PlantDetailFour: Story = {
  parameters: {
    docs: { description: { story: 'Four columns with one accented numeral (lifespan, ceremonial moment).' } },
  },
  render: () => (
    <div style={{ maxWidth: 540, margin: '0 auto', border: '1px solid var(--border)' }}>
      <StatRow cols={4}>
        <Stat num="6d" label="Last watered" />
        <Stat num="~14d" label="Interval" />
        <Stat num="3 of 5" label="Calibration" />
        <Stat num="427d" label="Lifespan" accent="var(--highlight)" />
      </StatRow>
    </div>
  ),
};

export const TwoCol: Story = {
  render: () => (
    <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
      <StatRow cols={2}>
        <Stat num={9} label="Active" />
        <Stat num={3} label="Archived" />
      </StatRow>
    </div>
  ),
};
