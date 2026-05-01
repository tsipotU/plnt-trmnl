import type { Meta, StoryObj } from '@storybook/react-vite';
import { RowState } from './RowState';

const meta: Meta<typeof RowState> = {
  title: 'Atoms/RowState',
  component: RowState,
  parameters: {
    docs: {
      description: {
        component:
          'Compact status pill for dense list rows. Microtype mono label + 5px dot, no background. Six tones: neutral, due, overdue, healthy, dormant, dialed-in. Use **Chip** when you need a filled background or richer contexts.',
      },
    },
  },
  argTypes: {
    tone: {
      control: { type: 'inline-radio' },
      options: ['neutral', 'due', 'overdue', 'healthy', 'dormant', 'dialed-in'],
    },
    dotOff: { control: 'boolean' },
  },
  args: {
    children: 'due today',
    tone: 'due',
  },
};
export default meta;

type Story = StoryObj<typeof RowState>;

export const Default: Story = {};

export const AllTones: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      <RowState tone="due">due today</RowState>
      <RowState tone="overdue">overdue 3d</RowState>
      <RowState tone="healthy">healthy</RowState>
      <RowState tone="dormant">dormant</RowState>
      <RowState tone="dialed-in">dialed in</RowState>
      <RowState tone="neutral">archived</RowState>
    </div>
  ),
};

export const InListRows: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => {
    const Row = ({
      name,
      latin,
      tone,
      label,
      interval,
    }: {
      name: string;
      latin: string;
      tone: 'due' | 'overdue' | 'healthy' | 'dormant' | 'dialed-in';
      label: string;
      interval: string;
    }) => (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          gap: 14,
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--ink)',
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 12,
              color: 'var(--ink-3)',
            }}
          >
            {latin}
          </div>
        </div>
        <RowState tone={tone}>{label}</RowState>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--ink-3)',
            letterSpacing: '0.06em',
            width: 56,
            textAlign: 'right',
          }}
        >
          {interval.toUpperCase()}
        </span>
      </div>
    );

    return (
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-2)',
          overflow: 'hidden',
          maxWidth: 540,
        }}
      >
        <Row name="Monstera" latin="Monstera deliciosa" tone="healthy" label="healthy" interval="~14d" />
        <Row name="Ferdinand" latin="Sansevieria trifasciata" tone="due" label="due today" interval="~21d" />
        <Row name="Greta" latin="Calathea ornata" tone="overdue" label="overdue 3d" interval="~10d" />
        <Row name="Cleo" latin="Pilea peperomioides" tone="dialed-in" label="dialed in" interval="~12d" />
        <Row name="Karoo" latin="Lithops karasmontana" tone="dormant" label="dormant" interval="~90d" />
      </div>
    );
  },
};
