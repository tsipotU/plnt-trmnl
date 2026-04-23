export interface ScheduledPlant {
  id: number;
  location: string;
  nextWaterDate: string; // YYYY-MM-DD
}

const MAX_PLANTS_PER_DAY = 2;
const SEARCH_RADIUS = 3;

function addDays(date: string, delta: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * Find the best watering date for a new plant, given scheduling constraints.
 *
 * Algorithm:
 * 1. If the ideal date has < MAX_PLANTS_PER_DAY, return it immediately.
 * 2. Search +-SEARCH_RADIUS days for a candidate with room.
 * 3. Score each candidate: closer = higher score; same-location bonus.
 * 4. Return the highest-scoring candidate.
 * 5. If no candidate found within radius, return ideal date (overflow accepted).
 */
export function findBestDate(
  idealDate: string,
  location: string,
  existing: ScheduledPlant[],
): string {
  // Build a count map and location set per date
  const countByDate = new Map<string, number>();
  const locationsByDate = new Map<string, Set<string>>();

  for (const plant of existing) {
    const d = plant.nextWaterDate;
    countByDate.set(d, (countByDate.get(d) ?? 0) + 1);
    if (!locationsByDate.has(d)) {
      locationsByDate.set(d, new Set());
    }
    locationsByDate.get(d)!.add(plant.location);
  }

  // Step 1: ideal date has room
  if ((countByDate.get(idealDate) ?? 0) < MAX_PLANTS_PER_DAY) {
    return idealDate;
  }

  // Step 2-4: search candidates
  let bestDate: string | null = null;
  let bestScore = -Infinity;

  for (let delta = 1; delta <= SEARCH_RADIUS; delta++) {
    for (const sign of [-1, 1]) {
      const candidate = addDays(idealDate, delta * sign);
      const count = countByDate.get(candidate) ?? 0;

      if (count >= MAX_PLANTS_PER_DAY) {
        continue; // no room
      }

      // Score: proximity (closer = higher) + location bonus
      const proximity = SEARCH_RADIUS + 1 - delta; // e.g. delta=1 → score 3, delta=3 → score 1
      const locationBonus = locationsByDate.get(candidate)?.has(location) ? 1 : 0;
      const score = proximity + locationBonus;

      if (score > bestScore) {
        bestScore = score;
        bestDate = candidate;
      }
    }
  }

  // Step 5: fall back to ideal date if nothing found
  return bestDate ?? idealDate;
}

export interface ScheduleResult {
  date: string;
  originalIdeal: string;
  overflowShifted: boolean;
  congested: boolean;
}

/**
 * Schedule a plant's next watering date with overflow/congestion metadata.
 *
 * Wraps findBestDate to return shift info callers can use for event logging:
 * - overflowShifted: chosen date differs from ideal (bin-packer moved it)
 * - congested: ideal kept AND at capacity (±3-day window also full)
 *
 * These flags are mutually exclusive by construction.
 */
export function scheduleNextWater(
  idealDate: string,
  location: string,
  existing: ScheduledPlant[],
): ScheduleResult {
  const countAtIdeal = existing.filter(p => p.nextWaterDate === idealDate).length;
  const chosen = findBestDate(idealDate, location, existing);

  if (chosen !== idealDate) {
    return { date: chosen, originalIdeal: idealDate, overflowShifted: true, congested: false };
  }
  // chosen === idealDate: either ideal had room, or window was full and we fell back.
  const congested = countAtIdeal >= MAX_PLANTS_PER_DAY;
  return { date: chosen, originalIdeal: idealDate, overflowShifted: false, congested };
}
