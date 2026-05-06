import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { MenuDrawer } from './MenuDrawer';

const meta: Meta<typeof MenuDrawer> = {
  title: 'Nav/MenuDrawer',
  component: MenuDrawer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Right-side navigation drawer over a scrim. Bound to `--nav-*` tokens (#169) so the surface treatment is consistent with the Header. Behaviour (focus trap, Escape, route-change-closes, body scroll lock) lives in the component; styling is fully in CSS.',
      },
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <div
          style={{
            background: 'var(--bg)',
            minHeight: 640,
            position: 'relative',
            width: 402,
            margin: '0 auto',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof MenuDrawer>;

/** Drawer closed — backdrop is absent, panel is off-screen. */
export const Closed: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button
          type="button"
          style={{ margin: 16, padding: '8px 12px', background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          onClick={() => setOpen(true)}
        >
          Open drawer
        </button>
        <MenuDrawer open={open} onClose={() => setOpen(false)} />
      </>
    );
  },
};

/** Drawer open — scrim visible, panel slid in from the right. */
export const Open: Story = {
  render: () => <MenuDrawer open={true} onClose={() => {}} />,
};

/** Same open state with deliberately busy page content scrolling underneath
    — the contract that the surface stays opaque and content does not bleed
    through. If this snapshots transparent, the `--nav-*` tokens have
    regressed. */
export const OpenLongList: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Regression contract: panel must read solid against busy underlying content. If the diff shows latin names or row text bleeding through, surface tokens are broken.',
      },
    },
  },
  render: () => (
    <>
      <ul style={{ listStyle: 'none', padding: 16, margin: 0, fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink)' }}>
        {Array.from({ length: 20 }, (_, i) => (
          <li key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--rule)' }}>
            Plant {i + 1} · <em style={{ color: 'var(--ink-2)' }}>Monstera deliciosa</em> · due in {i % 7}d
          </li>
        ))}
      </ul>
      <MenuDrawer open={true} onClose={() => {}} />
    </>
  ),
};

/** Open state in dark mode — verifies dark rebindings of surface, edge,
    scrim, and shadow tokens. */
export const OpenDark: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <div
          data-theme="dark"
          style={{
            background: 'var(--bg)',
            minHeight: 640,
            position: 'relative',
            width: 402,
            margin: '0 auto',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  render: () => (
    <>
      <ul style={{ listStyle: 'none', padding: 16, margin: 0, fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink)' }}>
        {Array.from({ length: 12 }, (_, i) => (
          <li key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--rule)' }}>
            Plant {i + 1} · <em style={{ color: 'var(--ink-2)' }}>Pellionia repens</em>
          </li>
        ))}
      </ul>
      <MenuDrawer open={true} onClose={() => {}} />
    </>
  ),
};
