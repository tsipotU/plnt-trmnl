// One-off: rasterize public/favicon.svg into a PNG icon set.
// Run locally on macOS — sharp (via libvips+librsvg+fontconfig) uses
// Apple Color Emoji to render the 🪴 glyph. Ubuntu CI runners lack
// color-emoji fonts, so this script is not wired into CI.
//
// Output PNGs are committed; this script exists so the set can be
// regenerated if the source SVG ever changes.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = join(__dirname, '..', 'packages', 'api', 'client');
const publicDir = join(clientDir, 'public');

// Dynamically import sharp from client's node_modules
const sharpModule = await import(join(clientDir, 'node_modules', 'sharp', 'lib', 'index.js'));
const sharp = sharpModule.default;

const svg = readFileSync(join(publicDir, 'favicon.svg'));

const sizes = [
  { file: 'favicon-16.png', size: 16 },
  { file: 'favicon-32.png', size: 32 },
  { file: 'favicon-64.png', size: 64 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
];

for (const { file, size } of sizes) {
  const buf = await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  writeFileSync(join(publicDir, file), buf);
  console.log(`wrote ${file} (${size}×${size}, ${buf.length} bytes)`);
}
