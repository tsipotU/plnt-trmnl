import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming/create';

const p7lLight = create({
  base: 'light',

  brandTitle: 'p7l · component catalog',
  brandUrl: '/',
  brandTarget: '_self',

  // Paper-and-ink palette mirrored from the design system.
  colorPrimary: '#5e7349',     // sage-500 (--accent)
  colorSecondary: '#9a6843',   // copper-400 (--highlight)

  appBg: '#f5f3ec',            // bone-100 (--bg-sunken)
  appContentBg: '#fbfaf6',     // bone-50 (--bg)
  appPreviewBg: '#fbfaf6',
  appBorderColor: '#ddd9ca',   // bone-300 (--border)
  appBorderRadius: 4,          // --r-2

  textColor: '#1a1a17',        // charcoal-500 (--ink)
  textInverseColor: '#fbfaf6',
  textMutedColor: '#555550',   // charcoal-300 (--ink-2)

  barTextColor: '#555550',
  barSelectedColor: '#1a1a17',
  barHoverColor: '#1a1a17',
  barBg: '#f5f3ec',

  inputBg: '#ffffff',
  inputBorder: '#ddd9ca',
  inputTextColor: '#1a1a17',
  inputBorderRadius: 2,        // --r-1

  fontBase: '"Inter Tight", system-ui, sans-serif',
  fontCode: '"JetBrains Mono", ui-monospace, monospace',
});

addons.setConfig({
  theme: p7lLight,
  sidebar: {
    showRoots: true,
  },
});
