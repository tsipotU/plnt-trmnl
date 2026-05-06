import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SettingsRow } from './SettingsRow';
import { Toggle } from '../../atoms/Toggle/Toggle';

const meta: Meta<typeof SettingsRow> = {
  title: 'Molecules/SettingsRow',
  component: SettingsRow,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Settings list row — label + description + trailing slot. The trailing slot is generic so callers can drop in a Toggle, mono value, chevron, or anything else. Adds keyboard activation (Enter / Space) when `onClick` is provided.',
      },
    },
  },
  args: {
    label: 'Dark theme',
    description: 'Switch to the dark appearance for low-light environments.',
  },
};
export default meta;

type Story = StoryObj<typeof SettingsRow>;

export const WithToggle: Story = {
  render: () => {
    const [on, setOn] = useState(false);
    return (
      <div style={{ maxWidth: 460, border: '1px solid var(--border)' }}>
        <SettingsRow
          label="Dark theme"
          description="Switch to the dark appearance for low-light environments."
          trailing={<Toggle checked={on} onCheckedChange={setOn} label="Dark theme" />}
        />
      </div>
    );
  },
};

export const WithChevron: Story = {
  render: () => (
    <div style={{ maxWidth: 460, border: '1px solid var(--border)' }}>
      <SettingsRow
        label="✨ AI tool connected"
        description="Last seen 2h ago · 1 plant pending"
        trailing="›"
        onClick={() => {}}
      />
    </div>
  ),
};

export const WithMonoValue: Story = {
  render: () => (
    <div style={{ maxWidth: 460, border: '1px solid var(--border)' }}>
      <SettingsRow
        label="Serial"
        trailing="TRMNL-7C2A-4F19"
      />
    </div>
  ),
};

export const SettingsList: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => {
    const [seasonal, setSeasonal] = useState(true);
    const [notifs, setNotifs] = useState(false);
    const [compact, setCompact] = useState(false);
    return (
      <div style={{ maxWidth: 460, margin: '0 auto', border: '1px solid var(--border)' }}>
        <SettingsRow
          label="✨ AI tool connected"
          description="Last seen 2h ago · 1 plant pending"
          trailing="›"
          onClick={() => {}}
        />
        <SettingsRow
          label="Seasonal adjustment"
          description="Stretch intervals in winter, tighten in summer."
          trailing={<Toggle checked={seasonal} onCheckedChange={setSeasonal} label="Seasonal adjustment" />}
        />
        <SettingsRow
          label="Notifications"
          description="Daily 9 AM digest if anything's due. Off by default."
          trailing={<Toggle checked={notifs} onCheckedChange={setNotifs} label="Notifications" />}
        />
        <SettingsRow
          label="Compact list"
          description="Denser plant rows on small screens."
          trailing={<Toggle checked={compact} onCheckedChange={setCompact} label="Compact list" />}
        />
        <SettingsRow
          label="Replay onboarding"
          trailing="›"
          onClick={() => {}}
        />
        <SettingsRow
          label="About p7l"
          description="Mission, version, credits"
          trailing="›"
          onClick={() => {}}
        />
      </div>
    );
  },
};
