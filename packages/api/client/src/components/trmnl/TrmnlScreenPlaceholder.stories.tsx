import type { Meta, StoryObj } from '@storybook/react-vite';
import { TrmnlScreenPlaceholder } from './TrmnlScreenPlaceholder';

const meta: Meta<typeof TrmnlScreenPlaceholder> = {
  title: 'TRMNL screens/Placeholder',
  component: TrmnlScreenPlaceholder,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Stand-in stories for the TRMNL e-ink rendering surface. Real stories will render the production Liquid template via LiquidJS with TRMNL framework v3.1 CSS as a Storybook decorator — see [#197](https://github.com/tsipotU/plnt-trmnl/issues/197). Until that bridge lands, these placeholders mark the slot in the catalog and document the device dimensions and grey-depth contract.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof TrmnlScreenPlaceholder>;

/** TRMNL OG — 800×480, 4-grey (1-bit dithered). */
export const OG: Story = {
  name: 'OG (placeholder)',
  args: {
    width: 800,
    height: 480,
    device: 'OG',
    grayscale: 4,
    issueRef: '#197',
  },
};

/** TRMNL X — 1872×1404, 16-grey. */
export const X: Story = {
  name: 'X (placeholder)',
  args: {
    width: 1872,
    height: 1404,
    device: 'X',
    grayscale: 16,
    issueRef: '#197',
  },
};
