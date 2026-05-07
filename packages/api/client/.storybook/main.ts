import type { StorybookConfig } from '@storybook/react-vite';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    getAbsolutePath('@storybook/addon-a11y'),
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-themes'),
  ],
  framework: getAbsolutePath('@storybook/react-vite'),

  // Strip vite-plugin-pwa from the Storybook Vite pipeline. It runs in the
  // production app build (see vite.config.ts) but if it runs in Storybook's
  // build it tries to precache Storybook's own multi-MB bundle and crashes
  // on the 2 MiB Workbox precache cap. Storybook is the design surface; the
  // PWA layer doesn't belong here.
  async viteFinal(config) {
    const stripPwa = (plugins: unknown[]): unknown[] =>
      plugins
        .filter((plugin) => {
          if (!plugin) return false;
          if (Array.isArray(plugin)) return true;
          if (typeof plugin !== 'object') return true;
          const name = (plugin as { name?: string }).name ?? '';
          return !(name === 'vite-plugin-pwa' || name.startsWith('vite-plugin-pwa:'));
        })
        .map((plugin) => (Array.isArray(plugin) ? stripPwa(plugin) : plugin));
    config.plugins = stripPwa(config.plugins ?? []) as typeof config.plugins;
    return config;
  },
};

export default config;
