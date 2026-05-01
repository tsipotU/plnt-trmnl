import type { Meta, StoryObj } from '@storybook/react-vite';
import { TopBar } from './TopBar';

const meta: Meta<typeof TopBar> = {
  title: 'Molecules/TopBar',
  component: TopBar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'App-shell header. Wordmark + optional mono-tracked meta caption + menu trigger. Lives at the top of every primary tab; the device safe-area padding is handled by the parent layout.',
      },
    },
  },
  args: {
    meta: 'private · 9 active',
    showMenu: true,
    onMenu: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof TopBar>;

export const Default: Story = {};

export const WithoutMeta: Story = { args: { meta: undefined } };

export const NoMenu: Story = { args: { showMenu: false } };

export const InAppShell: Story = {
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div
      style={{
        background: 'var(--bg)',
        minHeight: 320,
        maxWidth: 402,
        margin: '0 auto',
        border: '1px solid var(--border)',
      }}
    >
      <TopBar meta="private · 9 active" onMenu={() => {}} />
      <div style={{ padding: 'var(--sp-6) var(--sp-5)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink-2)', fontSize: 14 }}>
        (page content goes here — Today, Plants, Calendar, etc.)
      </div>
    </div>
  ),
};
