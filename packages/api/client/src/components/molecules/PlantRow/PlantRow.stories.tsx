import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlantRow } from './PlantRow';
import { RowState } from '../../atoms/RowState/RowState';
import { Pictogram } from '../../atoms/Pictogram/Pictogram';

const meta: Meta<typeof PlantRow> = {
  title: 'Molecules/PlantRow',
  component: PlantRow,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'List row for plants. Three-column grid: pictogram (48×48 framed) · text block (name + species + meta) · state pill. The state slot is a pure ReactNode — pass any `<RowState />` (or anything else) so the row stays decoupled from plant data shape.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof PlantRow>;

export const Default: Story = {
  args: {
    pictogram: <Pictogram name="leaf" size={28} />,
    name: 'Mona',
    species: 'Monstera deliciosa',
    meta: 'Living room · 7d cycle · dialed in',
    state: <RowState tone="due">Due today</RowState>,
    onClick: () => {},
  },
};

export const StatesGallery: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ maxWidth: 402, border: '1px solid var(--border)', background: 'var(--bg)' }}>
      <PlantRow
        pictogram={<Pictogram name="leaf" size={28} />}
        name="Mona"
        species="Monstera deliciosa"
        meta="Living room · 7d cycle · dialed in"
        state={<RowState tone="due">Due today</RowState>}
        onClick={() => {}}
      />
      <PlantRow
        pictogram={<Pictogram name="leaf" size={28} />}
        name="Big Frank"
        species="Ficus lyrata"
        meta="Studio · 8d cycle · dialed in"
        state={<RowState tone="overdue">Overdue 1d</RowState>}
        onClick={() => {}}
      />
      <PlantRow
        pictogram={<Pictogram name="leaf" size={28} />}
        name="Eddie"
        species="Sansevieria trifasciata"
        meta="Bedroom · 14d cycle · dialed in"
        state={<RowState tone="healthy">Comfortable</RowState>}
        onClick={() => {}}
      />
      <PlantRow
        pictogram={<Pictogram name="leaf" size={28} />}
        name="Drama Queen"
        species="Calathea orbifolia"
        meta="Bathroom · 5d cycle"
        state={<RowState tone="calibrating">Calibrating</RowState>}
        onClick={() => {}}
      />
      <PlantRow
        pictogram={<Pictogram name="pot" size={28} />}
        name="Henry"
        species="Echinocactus grusonii"
        meta="Window sill · 28d"
        state={<RowState tone="dormant">Dormant</RowState>}
        onClick={() => {}}
      />
      <PlantRow
        pictogram={<Pictogram name="leaf" size={28} />}
        name="Fernie"
        species="Nephrolepis exaltata"
        meta="Bathroom · 3d cycle"
        state={<RowState tone="just-added">New</RowState>}
        onClick={() => {}}
      />
    </div>
  ),
};

export const NoMeta: Story = {
  args: {
    pictogram: <Pictogram name="leaf" size={28} />,
    name: 'Sweetheart',
    species: 'Hoya kerrii',
    state: <RowState tone="just-added">New</RowState>,
    onClick: () => {},
  },
};

export const NoState: Story = {
  args: {
    pictogram: <Pictogram name="leaf" size={28} />,
    name: 'Mona',
    species: 'Monstera deliciosa',
    meta: 'Living room',
    onClick: () => {},
  },
};
