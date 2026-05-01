import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { Pictogram } from '../Pictogram/Pictogram';

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          'Mono uppercase button. Five variants: **primary** (sage, default action), **highlight** (copper, ceremonial — water/mark-watered), **secondary** (outline), **ghost** (text-only), **destructive** (archive/delete). Three sizes: sm/md/lg. `lg` (44px min-height) is the mobile tap target.',
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'inline-radio' },
      options: ['primary', 'highlight', 'secondary', 'ghost', 'destructive'],
    },
    size: { control: { type: 'inline-radio' }, options: ['sm', 'md', 'lg'] },
    fullWidth: { control: 'boolean' },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    children: 'Mark watered',
    variant: 'highlight',
    size: 'md',
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {};

export const Variants: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
      <Button variant="primary">Save changes</Button>
      <Button variant="highlight" iconLeading={<Pictogram name="drop" size={14} />}>
        Water now
      </Button>
      <Button variant="secondary">Calibrate (3 of 5)</Button>
      <Button variant="ghost" iconLeading={<Pictogram name="arrow" size={14} />}>
        Back
      </Button>
      <Button variant="destructive" iconLeading={<Pictogram name="archive" size={14} />}>
        Archive
      </Button>
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
      <Button size="sm" variant="secondary">
        Sm
      </Button>
      <Button size="md" variant="secondary">
        Md
      </Button>
      <Button size="lg" variant="secondary">
        Lg · tap target
      </Button>
    </div>
  ),
};

export const States: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, auto)',
        gap: 'var(--sp-3)',
        alignItems: 'center',
      }}
    >
      <Button variant="highlight">Default</Button>
      <Button variant="highlight" disabled>
        Disabled
      </Button>
      <Button variant="highlight" loading>
        Loading
      </Button>
      <Button variant="primary">Default</Button>
      <Button variant="primary" disabled>
        Disabled
      </Button>
      <Button variant="primary" loading>
        Loading
      </Button>
      <Button variant="secondary">Default</Button>
      <Button variant="secondary" disabled>
        Disabled
      </Button>
      <Button variant="secondary" loading>
        Loading
      </Button>
    </div>
  ),
};

export const FullWidth: Story = {
  args: { fullWidth: true, size: 'lg', variant: 'highlight', children: 'Mark watered' },
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: 320,
          background: 'var(--bg-sunken)',
          padding: 'var(--sp-6)',
          borderRadius: 'var(--r-2)',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export const WithIcons: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', maxWidth: 280 }}>
      <Button variant="highlight" size="lg" fullWidth iconLeading={<Pictogram name="drop" size={14} />}>
        Mark watered
      </Button>
      <Button variant="primary" size="md" iconLeading={<Pictogram name="plus" size={14} />}>
        Add plant
      </Button>
      <Button variant="secondary" size="md" iconTrailing={<Pictogram name="arrow" size={14} />}>
        Continue
      </Button>
    </div>
  ),
};
