import type { Meta, StoryObj } from '@storybook/react-vite';
import { RowState } from './RowState';

const meta: Meta<typeof RowState> = {
  title: 'Atoms/RowState',
  component: RowState,
  parameters: {
    docs: {
      description: {
        component:
          'Bordered pill for plant lifecycle states — mirrors the prototype `.m-row-state` exactly. Rectangular, 0.5px tone-or-ink border, mono uppercase 9.5px tracked, tone-driven fills. 8 tones cover every state PlantRow / FeedbackRow / EnrichmentQueue need.',
      },
    },
  },
  argTypes: {
    tone: {
      control: { type: 'inline-radio' },
      options: ['neutral', 'due', 'overdue', 'healthy', 'calibrating', 'dormant', 'just-added', 'vacation'],
    },
  },
  args: {
    children: 'Due today',
    tone: 'due',
  },
};
export default meta;

type Story = StoryObj<typeof RowState>;

export const Default: Story = {};

export const AllTones: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)', alignItems: 'center' }}>
      <RowState tone="due">Due today</RowState>
      <RowState tone="overdue">Overdue 3d</RowState>
      <RowState tone="healthy">Comfortable</RowState>
      <RowState tone="calibrating">Calibrating</RowState>
      <RowState tone="dormant">Dormant</RowState>
      <RowState tone="just-added">New</RowState>
      <RowState tone="vacation">Vacation</RowState>
      <RowState tone="neutral">Archived</RowState>
    </div>
  ),
};

export const InListRow: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => {
    const Row = ({
      name,
      latin,
      tone,
      label,
      meta,
    }: {
      name: string;
      latin: string;
      tone: 'due' | 'overdue' | 'healthy' | 'calibrating' | 'dormant' | 'vacation' | 'just-added';
      label: string;
      meta: string;
    }) => (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 14,
          alignItems: 'center',
          padding: '14px 18px',
          borderBottom: '0.5px solid var(--border)',
          background: 'var(--bg)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{name}</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{latin}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', color: 'var(--ink-2)', textTransform: 'uppercase', marginTop: 4 }}>{meta}</div>
        </div>
        <RowState tone={tone}>{label}</RowState>
      </div>
    );

    return (
      <div style={{ maxWidth: 402, border: '1px solid var(--border)', background: 'var(--bg)' }}>
        <Row name="Mona" latin="Monstera deliciosa" meta="Living room · 7d cycle · dialed in" tone="due" label="Due today" />
        <Row name="Big Frank" latin="Ficus lyrata" meta="Studio · 8d cycle" tone="overdue" label="Overdue 1d" />
        <Row name="Eddie" latin="Sansevieria trifasciata" meta="Bedroom · 14d" tone="healthy" label="Comfortable" />
        <Row name="Drama Queen" latin="Calathea orbifolia" meta="Bathroom · 5d cycle" tone="calibrating" label="Calibrating" />
        <Row name="Henry" latin="Echinocactus grusonii" meta="Window sill · 28d" tone="dormant" label="Dormant" />
        <Row name="Fernie" latin="Nephrolepis exaltata" meta="Bathroom · 3d cycle" tone="just-added" label="New" />
      </div>
    );
  },
};
