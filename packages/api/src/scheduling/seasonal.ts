import type { Config } from '../config.js';

/**
 * Returns true if `today` (YYYY-MM-DD) falls within the heating season
 * defined by config.heatingSeasonStart and config.heatingSeasonEnd.
 *
 * The heating season can wrap over year-end (e.g. Oct–Mar). In that case
 * a date in mid-December or mid-February is inside the season.
 */
export function isInHeatingSeason(
  today: string,
  config: Pick<Config, 'heatingSeasonStart' | 'heatingSeasonEnd'>,
): boolean {
  const [, mm, dd] = today.split('-').map(Number);
  const { heatingSeasonStart: start, heatingSeasonEnd: end } = config;

  // Encode month-day as a comparable integer (MMDD)
  const toMD = (month: number, day: number) => month * 100 + day;
  const todayMD = toMD(mm, dd);
  const startMD = toMD(start.month, start.day);
  const endMD = toMD(end.month, end.day);

  if (startMD <= endMD) {
    // Non-wrapping range (e.g. Apr–Sep)
    return todayMD >= startMD && todayMD <= endMD;
  }

  // Wrapping range (e.g. Oct–Mar): inside if on or after start, OR on or before end
  return todayMD >= startMD || todayMD <= endMD;
}

/**
 * Returns the seasonally adjusted interval for watering.
 *
 * Rules:
 * - If today is inside the heating season AND modifier is a positive number
 *   other than 1.0: return Math.round(baseInterval * modifier), clamped to
 *   a minimum of 1.
 * - Otherwise: return baseInterval unchanged.
 *
 * `current_interval` in the DB is never modified — only the computed
 * `next_water_date` reflects the seasonal adjustment.
 */
export function getSeasonalAdjustedInterval(
  baseInterval: number,
  modifier: number | null | undefined,
  today: string,
  config: Pick<Config, 'heatingSeasonStart' | 'heatingSeasonEnd'>,
): number {
  if (modifier == null || modifier <= 0) return baseInterval;
  if (!isInHeatingSeason(today, config)) return baseInterval;

  const adjusted = Math.round(baseInterval * modifier);
  return Math.max(adjusted, 1);
}
