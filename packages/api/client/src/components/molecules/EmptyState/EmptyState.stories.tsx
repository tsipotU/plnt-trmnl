import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptyState } from './EmptyState';
import { Button } from '../../atoms/Button/Button';

const meta: Meta<typeof EmptyState> = {
  title: 'Molecules/EmptyState',
  component: EmptyState,
  parameters: {
    docs: {
      description: {
        component:
          'Italic serif placeholder for empty lists, "no match" states, and "all caught up" messages. `align="center"` is the default; use `align="left"` when the empty state lives inside a list section (e.g. plant detail "no active conditions").',
      },
    },
  },
  argTypes: {
    align: { control: { type: 'inline-radio' }, options: ['center', 'left'] },
  },
  args: {
    align: 'center',
    children: 'No plants match.',
  },
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {};

export const InListSection: Story = {
  args: {
    align: 'left',
    children: 'No active conditions. Tap + to flag one.',
  },
};

export const WithAction: Story = {
  args: {
    children: 'No plants yet.',
    action: <Button variant="primary" size="sm">Add your first plant</Button>,
  },
};

export const Variations: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', maxWidth: 460, border: '1px solid var(--border)' }}>
      <EmptyState>All caught up.</EmptyState>
      <EmptyState>Nothing scheduled.</EmptyState>
      <EmptyState>No replies yet.</EmptyState>
      <EmptyState align="left">No active conditions. Tap + to flag one.</EmptyState>
    </div>
  ),
};
