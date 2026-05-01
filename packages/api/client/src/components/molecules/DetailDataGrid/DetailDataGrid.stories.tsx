import type { Meta, StoryObj } from '@storybook/react-vite';
import { DetailDataGrid, DataCell } from './DetailDataGrid';

const meta: Meta<typeof DetailDataGrid> = {
  title: 'Molecules/DetailDataGrid',
  component: DetailDataGrid,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Two-column data grid with hairline cells. Read-only by default; pass `editable` to a `<DataCell />` to render a dashed-underline cursor-text hint. Used on Plant Detail (vital stats) and Memorial.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof DetailDataGrid>;

export const PlantDetail: Story = {
  render: () => (
    <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
      <DetailDataGrid>
        <DataCell label="Last watered" value="2026-04-28" />
        <DataCell label="Next water" value="2026-05-04" />
        <DataCell label="Cycle" value="7d (base 9d)" />
        <DataCell label="Pot" value="24cm · Large" />
        <DataCell label="Light" value="Bright indirect" />
        <DataCell label="Calibration" value="4 cyc · conv" />
      </DetailDataGrid>
    </div>
  ),
};

export const Editable: Story = {
  parameters: { docs: { description: { story: 'Editable cells get a dashed underline + text cursor — visual hint that tapping opens an inline editor.' } } },
  render: () => (
    <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
      <DetailDataGrid>
        <DataCell label="Location" value="Living room" editable />
        <DataCell label="Light" value="Bright indirect" editable />
        <DataCell label="Pot category" value="Large" editable />
        <DataCell label="Origin" value="Purchased" editable />
      </DetailDataGrid>
    </div>
  ),
};

export const Memorial: Story = {
  render: () => (
    <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
      <DetailDataGrid>
        <DataCell label="Joined" value="2024-12-15" />
        <DataCell label="Archived" value="2026-04-04" />
        <DataCell label="Waterings" value="38" />
        <DataCell label="Offspring" value="0" />
        <DataCell label="Calibration cyc" value="5" />
        <DataCell label="Lived in" value="Bedroom" />
      </DetailDataGrid>
    </div>
  ),
};

export const ThreeCol: Story = {
  render: () => (
    <div style={{ maxWidth: 540, margin: '0 auto', border: '1px solid var(--border)' }}>
      <DetailDataGrid cols={3}>
        <DataCell label="Last" value="6d ago" />
        <DataCell label="Interval" value="~14d" />
        <DataCell label="Calibration" value="4 of 5" />
      </DetailDataGrid>
    </div>
  ),
};
