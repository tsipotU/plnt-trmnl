/// <reference types="vite/client" />

// Build-time injected via Vite `define` from packages/api/package.json — see #171.
// Format: semver string ("0.1.0", "1.0.0", "1.0.0-rc.1", etc.).
declare const __APP_VERSION__: string;
