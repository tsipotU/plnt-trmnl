import type { Meta, StoryObj } from '@storybook/react-vite';
import { Banner } from './Banner';
import { Pictogram } from '../Pictogram/Pictogram';
import { Button } from '../Button/Button';

const meta: Meta<typeof Banner> = {
  title: 'Atoms/Banner',
  component: Banner,
  parameters: {
    docs: {
      description: {
        component:
          'Inline notice with five tones. Border-left in tone color, optional eyebrow title, optional leading icon, optional action node, optional dismiss button. ARIA role auto-selects: `alert` for warning/error, `status` otherwise.',
      },
    },
  },
  argTypes: {
    tone: {
      control: { type: 'inline-radio' },
      options: ['info', 'success', 'warning', 'error', 'neutral'],
    },
    dismissible: { control: 'boolean' },
  },
  args: {
    tone: 'info',
    title: 'Heads up',
    children: 'Your AI tool hasn\'t enriched 3 plants yet. They\'ll get watering schedules once it polls.',
  },
};
export default meta;

type Story = StoryObj<typeof Banner>;

export const Default: Story = {};

export const AllTones: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', maxWidth: 640 }}>
      <Banner tone="info" title="Heads up" icon={<Pictogram name="bell" size={18} />}>
        Your AI tool hasn't enriched 3 plants yet. They'll get watering schedules once it polls.
      </Banner>
      <Banner tone="success" title="Calibration converged" icon={<Pictogram name="leaf" size={18} />}>
        Five cycles in a row at the same interval — Monstera is dialed in.
      </Banner>
      <Banner tone="warning" title="Heating season" icon={<Pictogram name="thermometer" size={18} />}>
        Watering frequency is bumped 30% until 2026-04-15.
      </Banner>
      <Banner tone="error" title="Renderer offline" icon={<Pictogram name="bell" size={18} />}>
        TRMNL hasn't received an updated screenshot since 2026-04-25. Check the renderer container.
      </Banner>
    </div>
  ),
};

export const WithAction: Story = {
  args: {
    tone: 'warning',
    title: 'Five plants are overdue',
    children: 'They were due before today and haven\'t been watered. Review them now?',
    icon: <Pictogram name="drop" size={18} />,
    action: (
      <Button variant="secondary" size="sm">
        Review
      </Button>
    ),
  },
};

export const Dismissible: Story = {
  args: {
    tone: 'success',
    title: 'Saved',
    children: 'Your changes to Ferdinand have been logged.',
    dismissible: true,
  },
};

export const TitleOnly: Story = {
  args: {
    tone: 'info',
    title: undefined,
    children: 'A subtle inline notice without a title. Use this when the text speaks for itself.',
  },
};
