import type { Plant } from '../components/PlantCard.js';
import type { IconName } from '../components/atoms/Pictogram/Pictogram.js';

const DAY_MS = 86_400_000;

export type PlantStateInfo = {
  tone: 'due' | 'overdue' | 'healthy' | 'calibrating' | 'just-added' | 'dormant';
  label: string;
};

/* Map a plant + the current ISO date to a {tone, label} pair. Page-level
   helper (per the slot-over-data principle in Foundations/Composition):
   pages compute this and feed the result to PlantRow's state slot.
   Today and Plants list both consume it. */
export function plantState(p: Plant, today: string): PlantStateInfo {
  const wateredToday = p.last_watered_at?.startsWith(today);
  const isOverdue = p.next_water_date != null && p.next_water_date < today;
  const isDueToday = p.next_water_date != null && p.next_water_date === today;
  const isCalibrating = p.is_converged === 0 && (p.current_interval ?? 0) > 0;
  const isNew = p.enrichment_status === 'pending';

  if (wateredToday) return { tone: 'healthy', label: 'Watered' };
  if (isOverdue) {
    const days = Math.max(
      1,
      Math.round(
        (new Date(today + 'T00:00').getTime() -
          new Date((p.next_water_date as string) + 'T00:00').getTime()) /
          DAY_MS,
      ),
    );
    return { tone: 'overdue', label: `Overdue ${days}d` };
  }
  if (isDueToday) return { tone: 'due', label: 'Due today' };
  if (isNew) return { tone: 'just-added', label: 'New' };
  if (isCalibrating) return { tone: 'calibrating', label: 'Calibrating' };
  if (p.next_water_date != null) {
    const days = Math.round(
      (new Date(p.next_water_date + 'T00:00').getTime() -
        new Date(today + 'T00:00').getTime()) /
        DAY_MS,
    );
    return { tone: 'healthy', label: `In ${days}d` };
  }
  return { tone: 'healthy', label: 'Comfortable' };
}

/* Map a plant to a Pictogram name. Plant rows don't yet carry `category`
   (catalog has it; per-plant rows don't), so we fall back to a generic leaf
   glyph. Promote to species/category-aware logic when that data is on the
   row payload. */
export function plantPictogram(_p: Plant): IconName {
  return 'leaf';
}

/* Build the meta line for PlantRow: location · interval cycle · dialed-in. */
export function plantMeta(p: Plant): string {
  const parts: string[] = [];
  if (p.location) parts.push(p.location);
  if (p.current_interval) parts.push(`${p.current_interval}d cycle`);
  if (p.is_converged === 1) parts.push('dialed in');
  return parts.join(' · ');
}

/* Display species line, falling back to common_name when species is missing.
   Shared between Today and PlantsList for consistency. */
export function plantSpeciesLine(p: Plant): string | undefined {
  return p.species ?? p.common_name ?? undefined;
}

/* ISO date for "today" — UTC, matches what the API + per-plant comparisons use. */
export function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
