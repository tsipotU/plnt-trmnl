import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toggle } from './Toggle';
import { FieldLabel } from '../FieldLabel/FieldLabel';

const meta: Meta<typeof Toggle> = {
  title: 'Atoms/Toggle',
  component: Toggle,
  parameters: {
    docs: {
      description: {
        component:
          'Switch with `role="switch"` + `aria-checked`. Supports controlled (`checked` + `onCheckedChange`) and uncontrolled (`defaultChecked`) modes. Use the `label` prop for an accessible name when there\'s no visible label.',
      },
    },
  },
  argTypes: {
    size: { control: { type: 'inline-radio' }, options: ['sm', 'md'] },
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Vacation mode',
    size: 'md',
    defaultChecked: false,
  },
};
export default meta;

type Story = StoryObj<typeof Toggle>;

export const UncontrolledOff: Story = {};

export const UncontrolledOn: Story = {
  args: { defaultChecked: true },
};

export const ControlledLive: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => {
    const [on, setOn] = useState(true);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
        <Toggle checked={on} onCheckedChange={setOn} label="Vacation mode" />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--ink-2)',
            letterSpacing: '0.06em',
          }}
        >
          {on ? 'ON' : 'OFF'}
        </span>
      </div>
    );
  },
};

export const Sizes: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
      <Toggle size="sm" defaultChecked label="Small toggle" />
      <Toggle size="md" defaultChecked label="Medium toggle" />
    </div>
  ),
};

export const Disabled: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
      <Toggle disabled label="Disabled off" />
      <Toggle disabled defaultChecked label="Disabled on" />
    </div>
  ),
};

export const InSettingsRow: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => {
    const [vacation, setVacation] = useState(false);
    const [notifications, setNotifications] = useState(true);
    const Row = ({
      label,
      hint,
      checked,
      onChange,
    }: {
      label: string;
      hint: string;
      checked: boolean;
      onChange: (v: boolean) => void;
    }) => (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'center',
          gap: 'var(--sp-4)',
          padding: 'var(--sp-4) 0',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <FieldLabel hint={hint}>{label}</FieldLabel>
        <Toggle checked={checked} onCheckedChange={onChange} label={label} />
      </div>
    );
    return (
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-2)',
          padding: 'var(--sp-6)',
          maxWidth: 460,
          fontFamily: 'var(--font-sans)',
        }}
      >
        <Row
          label="Vacation mode"
          hint="Pause watering reminders for all plants."
          checked={vacation}
          onChange={setVacation}
        />
        <Row
          label="Push reminders"
          hint="Send watering nudges via TRMNL."
          checked={notifications}
          onChange={setNotifications}
        />
      </div>
    );
  },
};
