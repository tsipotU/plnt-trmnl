import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConditionRow } from './ConditionRow';
import { Button } from '../../atoms/Button/Button';

const meta: Meta<typeof ConditionRow> = {
  title: 'Molecules/ConditionRow',
  component: ConditionRow,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Plant condition entry — severity badge + name + italic-serif symptoms + sans remedy + right-side action slot. Three severities map to semantic tokens: **info** (slate), **warning** (rust soft), **critical** (solid `--crit` red).',
      },
    },
  },
  argTypes: {
    severity: { control: { type: 'inline-radio' }, options: ['info', 'warning', 'critical'] },
  },
  args: {
    severity: 'info',
    name: 'Yellowing leaves',
    symptoms: 'Older or newer leaves turning yellow.',
    remedy: 'Check watering. Yellow + soggy soil = overwater. Yellow + bone dry = underwater.',
  },
};
export default meta;

type Story = StoryObj<typeof ConditionRow>;

export const Default: Story = {};

export const Severities: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
      <ConditionRow
        severity="info"
        name="Yellowing leaves"
        symptoms="Older or newer leaves turning yellow."
        remedy="Check watering. Yellow + soggy soil = overwater."
      />
      <ConditionRow
        severity="warning"
        name="Brown leaf edges"
        symptoms="Tips and edges going crispy brown."
        remedy="Usually low humidity or salt buildup. Mist, flush soil, or switch to filtered water."
      />
      <ConditionRow
        severity="critical"
        name="Spider mites"
        symptoms="Fine webbing under leaves, stippled yellow specks."
        remedy="Isolate the plant. Shower foliage, then spray with neem oil weekly for 3 weeks."
      />
    </div>
  ),
};

export const WithResolveAction: Story = {
  render: () => (
    <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
      <ConditionRow
        severity="warning"
        name="Brown leaf edges"
        symptoms="Tips of older leaves turning crispy brown."
        remedy="Likely low humidity or overwatering. Mist + check drainage."
        action={<Button variant="ghost" size="sm">Resolve</Button>}
      />
    </div>
  ),
};

export const SymptomsOnly: Story = {
  args: { remedy: undefined },
  parameters: { docs: { description: { story: 'Use when picking from the catalog — symptoms shown, remedy revealed after the user adds the condition.' } } },
};
