import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioRow } from './RadioRow';

const meta: Meta<typeof RadioRow> = {
  title: 'Molecules/RadioRow',
  component: RadioRow,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Radio option row: 18px circle + sans label + optional italic-serif description. Renders as `<button role="radio">`; parent component owns selection state. Hairline below; surface highlight on hover.',
      },
    },
  },
  args: {
    label: 'Just right',
    description: 'Top inch dry, slightly damp underneath. Perfect timing.',
    checked: true,
    onSelect: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof RadioRow>;

export const Default: Story = {};

export const Unchecked: Story = { args: { checked: false } };

export const NoDescription: Story = {
  args: { description: undefined, label: 'Skip this question' },
};

export const CalibrationGroup: Story = {
  parameters: {
    controls: { hideNoControlsWarning: true },
    docs: { description: { story: 'CalibrationModal pattern — parent renders one RadioRow per option and tracks the selected value. The ARIA semantics still resolve correctly because each row is `role="radio"` with `aria-checked`.' } },
  },
  render: () => {
    const [pick, setPick] = useState('just-right');
    const opts: Array<{ id: string; label: string; desc: string }> = [
      { id: 'dry',        label: 'Bone dry',        desc: 'Cracked, pulling away from the pot. Should have watered sooner.' },
      { id: 'just-right', label: 'Just right',      desc: 'Top inch dry, slightly damp underneath. Perfect timing.' },
      { id: 'damp',       label: 'Still damp',      desc: 'Wet to the touch. Could have waited a few days.' },
      { id: 'skip',       label: 'Skip this question', desc: "Just log the watering, don't recalibrate." },
    ];
    return (
      <div
        role="radiogroup"
        aria-label="How was the soil?"
        style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)', background: 'var(--bg)' }}
      >
        {opts.map((o) => (
          <RadioRow
            key={o.id}
            name="soil-state"
            value={o.id}
            label={o.label}
            description={o.desc}
            checked={pick === o.id}
            onSelect={() => setPick(o.id)}
          />
        ))}
      </div>
    );
  },
};
