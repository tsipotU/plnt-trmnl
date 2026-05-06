import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { Header } from './Header';

const meta: Meta<typeof Header> = {
  title: 'Nav/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Sticky page header. Two states: at-rest (opaque paper, soft hairline edge, no shadow) and scrolled (edge crisps, soft shadow lifts). Detects scroll via IntersectionObserver on a 1px sentinel — cheaper than a scroll listener. Bound to `--nav-*` tokens (#169) so the same surface treatment can extend to future nav layers without coining new tokens.',
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

type Story = StoryObj<typeof Header>;

/** Resting state — soft edge, no shadow. The default expectation. */
export const AtRest: Story = {
  render: () => (
    <>
      <Header />
      <div style={{ padding: 16, fontFamily: 'var(--font-serif)', color: 'var(--ink-2)', fontSize: 14 }}>
        Default page chrome over a paper-toned ground. Edge is `--nav-edge-soft`,
        no shadow, surface is `--nav-surface` (= `--bg`).
      </div>
    </>
  ),
};

/** Scrolled state — edge crisps to `--nav-edge`, `--nav-shadow-elev` lifts.
    Renders the data-scrolled attribute as if the IntersectionObserver had
    fired (Storybook decorator forces it on without needing real scroll). */
export const Scrolled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The contract story. Snapshot before / after the rebind, the surface should never read transparent again. If a chromatic diff shows content bleeding through, this is the regression alarm.',
      },
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <style>{`.p7l-nav-header { border-bottom-color: var(--nav-edge) !important; box-shadow: var(--nav-shadow-elev) !important; }`}</style>
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
  render: () => (
    <>
      <Header />
      <div style={{ padding: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: '8px 0' }}>Pellionia repens</h2>
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink-2)', margin: 0 }}>
          Trailing watermelon begonia
        </p>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 24, fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink)' }}>
          <li style={{ padding: '12px 0', borderBottom: '1px solid var(--rule)' }}>Monstera deliciosa · due tomorrow</li>
          <li style={{ padding: '12px 0', borderBottom: '1px solid var(--rule)' }}>Ficus lyrata · overdue 2 days</li>
          <li style={{ padding: '12px 0', borderBottom: '1px solid var(--rule)' }}>Zamioculcas zamiifolia · due in 4d</li>
        </ul>
      </div>
    </>
  ),
};

/** Same scrolled state in dark mode — verifies the dark rebindings of the
    surface, edge, and shadow tokens. */
export const ScrolledDark: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <style>{`.p7l-nav-header { border-bottom-color: var(--nav-edge) !important; box-shadow: var(--nav-shadow-elev) !important; }`}</style>
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
      <Header />
      <div style={{ padding: 16, color: 'var(--ink)', fontFamily: 'var(--font-serif)', fontSize: 14 }}>
        Dark rebindings: `--nav-surface` follows `--bg`, `--nav-edge` becomes
        `--bone-300`, scrim and shadow shift to ink-toned values. Tokens stay
        layer-named — no parallel `--nav-surface-dark`.
      </div>
    </>
  ),
};
