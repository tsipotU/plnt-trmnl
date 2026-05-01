import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs, type TabItem } from './Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Molecules/Tabs',
  component: Tabs,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Equal-width tab bar — primary app nav (Today/Plants/Cal/Archive/Set) and sub-nav inside modals (Common/Custom). Hairline separators between tabs, ink underline on the active tab, sans uppercase tracked labels.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Tabs>;

const PRIMARY_TABS: ReadonlyArray<TabItem> = [
  { id: 'today',    label: 'Today' },
  { id: 'plants',   label: 'Plants' },
  { id: 'calendar', label: 'Cal' },
  { id: 'archive',  label: 'Archive' },
  { id: 'settings', label: 'Set' },
];

export const PrimaryNav: Story = {
  render: () => {
    const [active, setActive] = useState('today');
    return (
      <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
        <Tabs items={PRIMARY_TABS} active={active} onChange={setActive} />
      </div>
    );
  },
};

const MODAL_TABS: ReadonlyArray<TabItem> = [
  { id: 'common', label: 'Common' },
  { id: 'custom', label: 'Custom' },
];

export const ModalSubNav: Story = {
  render: () => {
    const [active, setActive] = useState('common');
    return (
      <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
        <Tabs items={MODAL_TABS} active={active} onChange={setActive} />
      </div>
    );
  },
};

export const WithMeta: Story = {
  render: () => {
    const [active, setActive] = useState('today');
    const items: ReadonlyArray<TabItem> = [
      { id: 'today',    label: 'Today',   meta: '2 due' },
      { id: 'plants',   label: 'Plants',  meta: '9' },
      { id: 'calendar', label: 'Cal' },
      { id: 'archive',  label: 'Archive', meta: '3' },
      { id: 'settings', label: 'Set' },
    ];
    return (
      <div style={{ maxWidth: 402, margin: '0 auto', border: '1px solid var(--border)' }}>
        <Tabs items={items} active={active} onChange={setActive} />
      </div>
    );
  },
};
