import type { Meta, StoryObj } from '@storybook/react-vite';
import { FAB } from './FAB';
import { Pictogram } from '../../atoms/Pictogram/Pictogram';

const meta: Meta<typeof FAB> = {
  title: 'Molecules/FAB',
  component: FAB,
  parameters: {
    docs: {
      description: {
        component:
          'Floating action button. Round 48px, ink-on-paper, shadow-3 lift. Anchors bottom-right by default; pass `position="static"` to use inside non-anchored layouts. The `label` prop drives the accessible name.',
      },
    },
  },
  argTypes: {
    position: { control: { type: 'inline-radio' }, options: ['bottom-right', 'bottom-center', 'static'] },
  },
  args: {
    label: 'Add plant',
    icon: '+',
    position: 'static',
    onClick: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof FAB>;

export const Default: Story = {};

export const WithPictogram: Story = {
  args: { icon: <Pictogram name="plus" size={20} stroke={1.6} /> },
};

export const Anchored: Story = {
  parameters: {
    layout: 'fullscreen',
    controls: { hideNoControlsWarning: true },
  },
  render: () => (
    <div
      style={{
        position: 'relative',
        minHeight: 480,
        maxWidth: 402,
        margin: '0 auto',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: 'var(--sp-6)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink-2)' }}>
        (page content — Today, Plants list, etc. The FAB lives over the bottom-right corner.)
      </div>
      <FAB label="Add plant" icon="+" position="bottom-right" onClick={() => {}} />
    </div>
  ),
};
