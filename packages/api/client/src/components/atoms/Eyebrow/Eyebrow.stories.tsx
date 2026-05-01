import type { Meta, StoryObj } from '@storybook/react-vite';
import { Eyebrow } from './Eyebrow';

const meta: Meta<typeof Eyebrow> = {
  title: 'Atoms/Eyebrow',
  component: Eyebrow,
  parameters: {
    docs: {
      description: {
        component:
          'Mono uppercase tracked label used above section titles, in card chrome, and as muted dividers. Default size is `md` (11px); `sm` (10px) is for tight UI moments like sidebar headings.',
      },
    },
  },
  argTypes: {
    size: { control: { type: 'inline-radio' }, options: ['sm', 'md'] },
  },
  args: {
    children: 'plnt · trmnl · catalog',
    size: 'md',
  },
};
export default meta;

type Story = StoryObj<typeof Eyebrow>;

export const Default: Story = {};

export const Small: Story = { args: { size: 'sm' } };

export const Stack: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24 }}>
      <Eyebrow size="md">foundations · color</Eyebrow>
      <Eyebrow size="md">components · plant card</Eyebrow>
      <Eyebrow size="sm">v0.1 · 2026</Eyebrow>
      <Eyebrow size="sm">cycle 4 of 5</Eyebrow>
    </div>
  ),
};
