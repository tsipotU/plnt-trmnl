import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Read the API package.json at build time so the SPA's About / Settings
// version display always reflects the deployed instance — see #171.
const apiPkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf-8'),
) as { version: string };

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(apiPkg.version),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3900',
    },
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
  },
});
