/**
 * #75 — Client-side mirror of packages/api/src/conditions/generic.ts.
 *
 * Kept in sync with the API module (see generic.test.ts for the drift check).
 * The client tsconfig only includes `src`, so we duplicate rather than
 * cross-package import. 10 entries, low maintenance overhead.
 */
export interface GenericCondition {
  name: string;
  symptoms: string;
  remedy: string;
  severity: 'info' | 'warning' | 'critical';
  prevention: string;
}

export const GENERIC_CONDITIONS: readonly GenericCondition[] = [
  {
    name: 'Root rot',
    symptoms: 'Yellow leaves, mushy stems, foul soil smell',
    remedy: 'Unpot, trim black roots, repot in fresh well-draining mix',
    severity: 'critical',
    prevention: 'Ensure drainage, let soil dry between waterings',
  },
  {
    name: 'Overwatering',
    symptoms: 'Wilting despite wet soil, soft/yellow lower leaves',
    remedy: 'Let soil dry fully, check drainage, reduce watering frequency',
    severity: 'warning',
    prevention: 'Check soil moisture before watering; err on the dry side',
  },
  {
    name: 'Underwatering',
    symptoms: 'Crispy leaf edges, drooping, dry compacted soil',
    remedy: 'Bottom-water thoroughly, resume regular schedule',
    severity: 'warning',
    prevention: 'Stick to a schedule, check soil weekly in hot weather',
  },
  {
    name: 'Leaf yellowing',
    symptoms: 'Even yellow tint across older leaves',
    remedy: 'Review watering, light, and feed — often a nutrient or water issue',
    severity: 'info',
    prevention: 'Balanced fertilizing in growing season, consistent watering',
  },
  {
    name: 'Leaf drop',
    symptoms: 'Leaves falling off, often lower or older ones first',
    remedy: 'Stabilize conditions: keep temperature, light, and watering consistent',
    severity: 'warning',
    prevention: 'Avoid sudden moves, drafts, or temperature swings',
  },
  {
    name: 'Fungal leaf spots',
    symptoms: 'Brown or black spots with yellow halos, often spreading',
    remedy: 'Remove affected leaves, improve airflow, avoid wetting foliage',
    severity: 'warning',
    prevention: 'Water at the base, keep leaves dry, ventilate the room',
  },
  {
    name: 'Mealybugs',
    symptoms: 'White cottony clusters in leaf joints, sticky residue',
    remedy: 'Dab with alcohol-soaked cotton, rinse leaves, isolate the plant',
    severity: 'warning',
    prevention: 'Inspect new plants, wipe leaves periodically',
  },
  {
    name: 'Spider mites',
    symptoms: 'Fine webbing under leaves, stippled or bronze foliage',
    remedy: 'Shower the plant, wipe leaves, treat with neem or insecticidal soap',
    severity: 'warning',
    prevention: 'Raise humidity, inspect undersides of leaves regularly',
  },
  {
    name: 'Pest infestation',
    symptoms: 'Visible insects, chewed leaves, sticky or sooty residue',
    remedy: 'Identify the pest, isolate the plant, treat with appropriate remedy',
    severity: 'warning',
    prevention: 'Quarantine new plants for two weeks, inspect regularly',
  },
  {
    name: 'Nutrient deficiency',
    symptoms: 'Pale new growth, veined yellowing, stunted leaves',
    remedy: 'Apply a balanced liquid fertilizer at half strength',
    severity: 'info',
    prevention: 'Fertilize monthly in growing season with diluted feed',
  },
] as const;
