import type { Meta, StoryObj } from '@storybook/react-vite';
import { PhotoStripCell } from './PhotoStripCell';
import { Pictogram } from '../../atoms/Pictogram/Pictogram';

const meta: Meta<typeof PhotoStripCell> = {
  title: 'Molecules/PhotoStripCell',
  component: PhotoStripCell,
  parameters: {
    docs: {
      description: {
        component:
          'Single cell of a plant\'s photo strip. Two variants: **image** (framed, with optional date overlay) and **add** (dashed border + "+" affordance). The strip layout itself is page-level (horizontal scroll); the cell only handles its own framing.',
      },
    },
  },
  argTypes: {
    variant: { control: { type: 'inline-radio' }, options: ['image', 'add'] },
  },
  args: {
    variant: 'image',
    label: 'Photo · 2026-04-15',
    date: '2026-04-15',
    children: <Pictogram name="leaf" size={36} />,
  },
};
export default meta;

type Story = StoryObj<typeof PhotoStripCell>;

export const ImageCell: Story = {};

export const AddCell: Story = {
  args: {
    variant: 'add',
    label: 'Add photo',
    date: undefined,
    children: (
      <>
        <span style={{ fontSize: 18, lineHeight: 1, color: 'var(--ink-3)' }}>+</span>
        <span>Add photo</span>
      </>
    ),
  },
};

export const InStrip: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '10px 18px 16px',
        overflowX: 'auto',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        maxWidth: 402,
      }}
    >
      <PhotoStripCell
        variant="add"
        label="Add photo"
      >
        <span style={{ fontSize: 18, lineHeight: 1, color: 'var(--ink-3)' }}>+</span>
        <span>Add photo</span>
      </PhotoStripCell>
      <PhotoStripCell variant="image" label="Photo · 2026-04-30" date="2026-04-30">
        <Pictogram name="leaf" size={36} />
      </PhotoStripCell>
      <PhotoStripCell variant="image" label="Photo · 2026-04-04" date="2026-04-04">
        <Pictogram name="leaf" size={36} />
      </PhotoStripCell>
      <PhotoStripCell variant="image" label="Photo · 2026-02-04" date="2026-02-04">
        <Pictogram name="leaf" size={36} />
      </PhotoStripCell>
    </div>
  ),
};
