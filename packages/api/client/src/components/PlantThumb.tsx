import { useState } from 'react';
import type { Plant } from './PlantCard';
import { Pictogram } from './atoms/Pictogram/Pictogram';
import { plantPictogram } from '../utils/plantView';

export interface PlantThumbProps {
  plant: Plant;
  /** Pixel size for the fallback Pictogram. The img fills its parent slot. */
  size?: number;
}

/**
 * Pictogram-or-illustration slot for plant rows (Dashboard, Plants list,
 * Calendar). Prefers the catalog illustration when one is on the plant row;
 * falls back to the leaf Pictogram when no path is set OR when the image
 * fails to load (the catalog illustration rollout is partial — most species
 * don't yet have a file). The fallback is always a real Pictogram, never a
 * blank square — fixes #173.
 *
 * The `<img>` fills 100% × 100% of the surrounding 48×48 frame (PlantRow's
 * .p7l-plantrow__pic). Pictogram fallback uses `size` (default 28) so the
 * glyph matches the prior look-and-feel exactly.
 */
export function PlantThumb({ plant, size = 28 }: PlantThumbProps) {
  const [failed, setFailed] = useState(false);
  const path = plant.illustration_path;

  if (path && !failed) {
    return (
      <img
        src={`/api/illustrations/${encodeURIComponent(path)}`}
        alt={plant.species ?? plant.name}
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }

  return <Pictogram name={plantPictogram(plant)} size={size} />;
}
