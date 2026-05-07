import type { ReactNode } from 'react';

/* 24×24 mid-century geometric icon set.
   Construction rules: 1.5px stroke (the SVG sets it), square caps, miter joins.
   Glyph paths only — the Pictogram wrapper handles size, stroke width, and color
   via currentColor + props. Add new icons to this map and they're available
   automatically via <Pictogram name="..." />. */

export const icons: Record<string, ReactNode> = {
  drop: (
    <path d="M12 3 C 7 11, 5 14, 5 17 a7 7 0 0 0 14 0 C 19 14, 17 11, 12 3Z" />
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2.1 2.1M17.4 17.4l2.1 2.1M4.5 19.5l2.1-2.1M17.4 6.6l2.1-2.1" />
    </>
  ),
  leaf: <path d="M5 19 C 5 11, 11 5, 19 5 C 19 13, 13 19, 5 19Z M5 19 L 13 11" />,
  pot: <path d="M5 9 H 19 L 17 20 H 7 Z M3 6 H 21 V 9 H 3 Z" />,
  thermometer: (
    <>
      <circle cx="12" cy="18" r="3" />
      <path d="M12 15 V 4 a 2 2 0 1 1 0 4" />
    </>
  ),
  cal: (
    <>
      <rect x="3.5" y="5" width="17" height="15" />
      <path d="M3.5 10 H 20.5 M8 3 V 7 M16 3 V 7" />
    </>
  ),
  bell: (
    <path d="M6 16 V 11 a 6 6 0 0 1 12 0 V 16 L 20 18 H 4 Z M10 21 a 2 2 0 0 0 4 0" />
  ),
  scissors: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M8.5 8 L 21 20 M8.5 16 L 21 4" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15 L 21 21" />
    </>
  ),
  arrow: <path d="M5 12 H 19 M13 6 L 19 12 L 13 18" />,
  plus: <path d="M12 5 V 19 M5 12 H 19" />,
  archive: (
    <>
      <rect x="3" y="4" width="18" height="5" />
      <path d="M5 9 V 20 H 19 V 9 M9 13 H 15" />
    </>
  ),
  graph: <path d="M3 19 H 21 M5 16 L 9 11 L 13 14 L 19 6" />,
  hand: (
    <path d="M9 11 V 5 a 1.5 1.5 0 0 1 3 0 V 11 V 4 a 1.5 1.5 0 0 1 3 0 V 11 V 6 a 1.5 1.5 0 0 1 3 0 V 14 a 6 6 0 0 1 -6 6 H 11 a 4 4 0 0 1 -4 -4 V 12 a 1.5 1.5 0 0 1 3 0 Z" />
  ),
  house: <path d="M4 11 L 12 4 L 20 11 V 20 H 4 Z M10 20 V 14 H 14 V 20" />,
  bookmark: <path d="M6 3 H 18 V 21 L 12 16 L 6 21 Z" />,
  beaker: (
    <path d="M9 3 H 15 M10 3 V 10 L 5 19 a 1.5 1.5 0 0 0 1.4 2 H 17.6 a 1.5 1.5 0 0 0 1.4 -2 L 14 10 V 3" />
  ),
  balloon: (
    // Speech balloon with a tail going down-left. Used for the feedback FAB
    // (#165) — a + glyph reads as 'add an item', a balloon reads as comms.
    <path d="M5 4 H 19 a 2 2 0 0 1 2 2 V 14 a 2 2 0 0 1 -2 2 H 13 L 8 21 L 9 16 H 5 a 2 2 0 0 1 -2 -2 V 6 a 2 2 0 0 1 2 -2 Z" />
  ),
  camera: (
    // Body + lens circle + viewfinder bump. Used for "photo" care-log entries (#203).
    <>
      <rect x="2" y="8" width="20" height="13" rx="2" />
      <circle cx="12" cy="14" r="3" />
      <path d="M8 8 L 10 5 H 14 L 16 8" />
    </>
  ),
};

export type IconName = keyof typeof icons;
export const ICON_NAMES = Object.keys(icons) as IconName[];
