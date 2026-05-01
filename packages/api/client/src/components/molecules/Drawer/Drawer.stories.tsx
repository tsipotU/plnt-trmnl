import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Drawer, DrawerLink } from './Drawer';
import { Button } from '../../atoms/Button/Button';

const meta: Meta<typeof Drawer> = {
  title: 'Molecules/Drawer',
  component: Drawer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Right-slide drawer with backdrop. Closes on backdrop click and Escape. Compose with **DrawerLink** rows (active state, optional meta). Optional footer slot for status info.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Drawer>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [active, setActive] = useState('add');
    const links: ReadonlyArray<[string, string, string]> = [
      ['add',         'Add plant',         'New +'],
      ['feedback',    'Feedback',          '4'],
      ['enrichment',  'Enrichment queue',  '1 pending'],
      ['images',      'Image briefing',    'wave 3'],
      ['scan',        'Scan a plant',      'wave 4'],
      ['notifications','Notifications',    'wave 4'],
      ['trmnl',       'TRMNL device',      'paired'],
      ['ai-prompt',   'AI tool',           'connected'],
      ['roadmap',     'Roadmap',           '5 waves'],
      ['about',       'About p7l',         'v1·0·0'],
    ];

    return (
      <div style={{ position: 'relative', minHeight: 600, background: 'var(--bg-sunken)', padding: 'var(--sp-6)' }}>
        <Button variant="primary" onClick={() => setOpen(true)}>Open drawer</Button>

        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          title="Navigate"
          footer={
            <>
              <span>9 active · 3 archived</span>
              <span>✨ ai connected</span>
            </>
          }
        >
          {links.map(([id, label, meta]) => (
            <DrawerLink
              key={id}
              active={active === id}
              meta={meta}
              onClick={() => setActive(id)}
            >
              {label}
            </DrawerLink>
          ))}
        </Drawer>
      </div>
    );
  },
};

export const ShortList: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div style={{ position: 'relative', minHeight: 400, background: 'var(--bg-sunken)', padding: 'var(--sp-6)' }}>
        <Button variant="secondary" onClick={() => setOpen(true)}>Reopen</Button>
        <Drawer open={open} onClose={() => setOpen(false)} title="Quick nav">
          <DrawerLink>Settings</DrawerLink>
          <DrawerLink active>Plants</DrawerLink>
          <DrawerLink>Archive</DrawerLink>
        </Drawer>
      </div>
    );
  },
};
