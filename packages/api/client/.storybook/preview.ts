import type { Preview } from '@storybook/react-vite';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import '../src/styles/tokens.css';
import './storybook.css';

/* The light/dark toggle in the toolbar is provided by @storybook/addon-themes.
   It sets data-theme="light" or data-theme="dark" on <html>, which the token
   layer in tokens.css responds to. Components never read the theme directly;
   they consume semantic tokens (--bg, --ink, --accent, ...) and the right
   value falls out for the active theme. See Foundations/Theming. */

const preview: Preview = {
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'paper',
      values: [
        { name: 'paper', value: '#fbfaf6' },
        { name: 'sunken', value: '#f5f3ec' },
        { name: 'elevated', value: '#ffffff' },
        { name: 'inverse', value: '#1a1a17' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
  decorators: [
    withThemeByDataAttribute({
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
  ],
};

export default preview;
