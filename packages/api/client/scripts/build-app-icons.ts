/* Build app icon PNGs from the design-system ApothecaryStamp.
 *
 * Single source of truth: imports the React component + server-renders it to
 * SVG, wraps in a plate (matching the Logo.stories.tsx `AppIcons` story), then
 * rasterizes through sharp.
 *
 * Output: packages/api/client/public/icons/{bone,slate}-{192,512,180}.png
 *
 * Run via:  cd packages/api/client && npm run build:icons
 * Wired into the client `prebuild` script so PNGs always reflect the current
 * component (no commit-the-PNG drift).
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ApothecaryStamp } from '../src/components/atoms/Logo/ApothecaryStamp.js';

// Brand-token resolved values (mirror packages/api/client/src/styles/tokens.css).
// Hard-coded here because the icon export runs in Node and CSS variables don't
// resolve outside the browser. Keep these in sync with tokens.css.
const TOKENS = {
  bone100: '#f5f3ec',
  slate700: '#2c383f',
  charcoal500: '#1a1a17',
  copper300: '#b88660', // lighter — pairs with dark plate
  copper400: '#9a6843', // darker — pairs with light plate
} as const;

interface PlateSpec {
  name: 'bone' | 'slate';
  background: string;
  ink: string;
  accent: string;
}

const PLATES: PlateSpec[] = [
  { name: 'bone', background: TOKENS.bone100, ink: TOKENS.charcoal500, accent: TOKENS.copper400 },
  { name: 'slate', background: TOKENS.slate700, ink: TOKENS.bone100, accent: TOKENS.copper300 },
];

// Per the Logo.stories.tsx `AppIcons` story: 14% safe-area inset, soft-rect
// plate. The story uses borderRadius: 28 at size 140 (≈20% radius). We use
// the same ratio so the curvature scales consistently.
const SAFE_AREA_INSET_PCT = 0.14;
const PLATE_RADIUS_PCT = 0.20;

const SIZES: Array<{ size: number; suffix: string }> = [
  { size: 192, suffix: '192' },
  { size: 512, suffix: '512' },
  { size: 180, suffix: '180' }, // apple-touch-icon
];

function buildPlateSvg(plate: PlateSpec, pixelSize: number): string {
  const inset = pixelSize * SAFE_AREA_INSET_PCT;
  const stampSize = pixelSize - inset * 2;
  const radius = pixelSize * PLATE_RADIUS_PCT;

  // Render the stamp inner content. microtextOff is required — the curved
  // microtext stops being legible below 36px and we're targeting app-icon
  // contexts where it'd be a smudge.
  const stampSvgString = renderToStaticMarkup(
    createElement(ApothecaryStamp, {
      size: stampSize,
      microtextOff: true,
      color: plate.ink,
      accent: plate.accent,
    }),
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelSize}" height="${pixelSize}" viewBox="0 0 ${pixelSize} ${pixelSize}">
  <rect x="0" y="0" width="${pixelSize}" height="${pixelSize}" rx="${radius}" ry="${radius}" fill="${plate.background}"/>
  <g transform="translate(${inset} ${inset})">${stampSvgString}</g>
</svg>`;
}

/** Browser-tab favicons: stamp on transparent bg, no plate. The CSS variable
 *  trick at the top makes the stamp ink-color follow `prefers-color-scheme`,
 *  so the same favicon.svg looks correct in light + dark browser themes
 *  without needing two files. PNG fallbacks (16/32) ship the bone-tinted
 *  ink for legacy browsers — small enough that mode-awareness is moot. */
function buildFaviconSvg(): string {
  const stampSvgString = renderToStaticMarkup(
    createElement(ApothecaryStamp, {
      size: 64,
      microtextOff: true,
      color: 'currentColor',
      accent: 'currentColor', // mono on transparent — accent fights legibility at favicon scale
    }),
  );
  // Strip the outer `<svg ...>` from ApothecaryStamp's output and wrap with
  // our own that carries the prefers-color-scheme styling.
  const inner = stampSvgString.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <style>
    :root { color: #1a1a17; }
    @media (prefers-color-scheme: dark) { :root { color: #f5f3ec; } }
  </style>
  ${inner}
</svg>`;
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const publicDir = resolve(here, '../public');
  const outDir = resolve(publicDir, 'icons');
  await mkdir(outDir, { recursive: true });

  const summaries: string[] = [];
  for (const plate of PLATES) {
    for (const { size, suffix } of SIZES) {
      const svg = buildPlateSvg(plate, size);
      const png = await sharp(Buffer.from(svg)).png().toBuffer();
      const outPath = resolve(outDir, `${plate.name}-${suffix}.png`);
      await writeFile(outPath, png);
      summaries.push(`  icons/${plate.name}-${suffix}.png  (${size}×${size})`);
    }
  }

  // Browser-tab favicons. SVG is the modern path; 16/32 PNGs are legacy fallbacks.
  const faviconSvg = buildFaviconSvg();
  await writeFile(resolve(publicDir, 'favicon.svg'), faviconSvg);
  summaries.push('  favicon.svg              (vector, mode-aware)');

  // For PNG favicons, render the stamp on bone background — at 16/32 a
  // transparent-bg favicon is fine but the bone variant matches the most
  // common light-mode browser chrome.
  const faviconPlate = PLATES[0]; // bone
  for (const small of [16, 32]) {
    const svg = buildPlateSvg(faviconPlate, small);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    await writeFile(resolve(publicDir, `favicon-${small}.png`), png);
    summaries.push(`  favicon-${small}.png            (${small}×${small})`);
  }

  console.log(`Built ${summaries.length} icon assets → ${publicDir}`);
  for (const s of summaries) console.log(s);
}

main().catch((err) => {
  console.error('Icon export failed:', err);
  process.exitCode = 1;
});
