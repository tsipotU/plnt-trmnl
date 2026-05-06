import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { HamburgerMenu } from './HamburgerMenu';

const meta: Meta<typeof HamburgerMenu> = {
  title: 'Nav/HamburgerMenu',
  component: HamburgerMenu,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Three 1px hairlines that cross into an X on `aria-expanded="true"`. Replaces the chunky `≡` glyph — reads as *three rules* rather than *three thick bars*, matching the editorial vocabulary of the rest of the system. 44×44 tap target preserved for touch accessibility. Transition is 160ms on `--ease-standard`.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof HamburgerMenu>;

/** At-rest state — three even hairlines, the closed glyph. */
export const Closed: Story = {
  render: () => <HamburgerMenu open={false} onToggle={() => {}} />,
};

/** Mid-transition (visualised statically by toggling `open` interactively).
    Tap to flip; observe the 160ms cross. */
export const Pressed: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Click the button to see the X-transition in motion. The timing comes from `--motion-base`; the curve from `--ease-standard`.',
      },
    },
  },
  render: () => {
    const [open, setOpen] = useState(false);
    return <HamburgerMenu open={open} onToggle={() => setOpen((v) => !v)} />;
  },
};

/** Open state — top + bottom rotated to ±45°, middle faded. The end-state
    of the transition. */
export const Open: Story = {
  render: () => <HamburgerMenu open={true} onToggle={() => {}} />,
};
