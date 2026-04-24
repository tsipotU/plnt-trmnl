import type { Config } from '../config.js';

type HeatingSeasonCfg = Pick<Config, 'heatingSeasonStart' | 'heatingSeasonEnd'>;
type GrowingSeasonCfg = Pick<
  Config,
  'growingSeasonStart' | 'growingSeasonEnd' | 'growingSeasonMultiplier' | 'dormancyMultiplier'
>;
export type SeasonalConfig = HeatingSeasonCfg & GrowingSeasonCfg;

/**
 * Returns true if `today` (YYYY-MM-DD) falls within the heating season
 * defined by config.heatingSeasonStart and config.heatingSeasonEnd.
 *
 * The heating season can wrap over year-end (e.g. Oct–Mar). In that case
 * a date in mid-December or mid-February is inside the season.
 */
export function isInHeatingSeason(
  today: string,
  config: HeatingSeasonCfg,
): boolean {
  const [, mm, dd] = today.split('-').map(Number);
  const { heatingSeasonStart: start, heatingSeasonEnd: end } = config;
  return isInRange(mm, dd, start, end);
}

/**
 * Returns true if `today` falls within the configured growing season
 * (defaults Apr 1 – Sep 30). Supports year-wrapping ranges like heating season.
 */
export function isInGrowingSeason(
  today: string,
  config: Pick<Config, 'growingSeasonStart' | 'growingSeasonEnd'>,
): boolean {
  const [, mm, dd] = today.split('-').map(Number);
  const { growingSeasonStart: start, growingSeasonEnd: end } = config;
  return isInRange(mm, dd, start, end);
}

function isInRange(
  mm: number,
  dd: number,
  start: { month: number; day: number },
  end: { month: number; day: number },
): boolean {
  const toMD = (month: number, day: number) => month * 100 + day;
  const todayMD = toMD(mm, dd);
  const startMD = toMD(start.month, start.day);
  const endMD = toMD(end.month, end.day);
  if (startMD <= endMD) return todayMD >= startMD && todayMD <= endMD;
  return todayMD >= startMD || todayMD <= endMD;
}

/**
 * LEGACY helper — preserved for backwards compatibility with existing call sites
 * and tests. Returns the per-plant heating-season-modifier-adjusted interval
 * (volume-era semantics).
 *
 * New callers should use `applySeasonalMultipliers` which stacks heating +
 * growing/dormancy multipliers and returns structured metadata.
 */
export function getSeasonalAdjustedInterval(
  baseInterval: number,
  modifier: number | null | undefined,
  today: string,
  config: HeatingSeasonCfg,
): number {
  if (modifier == null || modifier <= 0) return baseInterval;
  if (!isInHeatingSeason(today, config)) return baseInterval;

  const adjusted = Math.round(baseInterval * modifier);
  return Math.max(adjusted, 1);
}

export interface ApplySeasonalInput {
  baseInterval: number;
  perPlantHeatingModifier: number | null | undefined;
  today: string;
  config: SeasonalConfig;
}

export interface SeasonalResult {
  /** Final effective interval after stacking applicable multipliers, clamped ≥1. */
  interval: number;
  heatingApplied: boolean;
  growingApplied: boolean;
  dormancyApplied: boolean;
  /** Human-readable enumeration of which layers fired (for event log reason). */
  reason: string;
  intervalChanged: boolean;
}

/**
 * Compose the full seasonal multiplier for #36.
 *
 * Stacks multiplicatively:
 *   effective = round(base * heatingModifier * growthOrDormancyMultiplier)
 *
 * - heatingModifier = per-plant heating_season_modifier when today ∈ heating
 *   season AND modifier is a positive number != 1.0, else 1.0.
 * - growthOrDormancyMultiplier = growingSeasonMultiplier if today ∈ growing
 *   season else dormancyMultiplier. A 1.0 value is treated as "not applied"
 *   for reason-reporting purposes.
 *
 * Result is clamped to ≥1 day.
 *
 * The per-plant `current_interval` in the DB is never mutated — only the
 * computed `next_water_date` reflects the adjustment. See
 * docs/plans/2026-04-24-issue-36-design.md for the rationale.
 */
export function applySeasonalMultipliers(input: ApplySeasonalInput): SeasonalResult {
  const { baseInterval, perPlantHeatingModifier, today, config } = input;

  // Heating layer
  const heatingInSeason = isInHeatingSeason(today, config);
  const heatingModValid =
    perPlantHeatingModifier != null &&
    Number.isFinite(perPlantHeatingModifier) &&
    perPlantHeatingModifier > 0;
  const heatingMod = heatingInSeason && heatingModValid ? (perPlantHeatingModifier as number) : 1.0;
  const heatingApplied = heatingInSeason && heatingModValid && heatingMod !== 1.0;

  // Growing / dormancy layer
  const inGrowing = isInGrowingSeason(today, config);
  const growMult = inGrowing ? config.growingSeasonMultiplier : config.dormancyMultiplier;
  const growMultValid = Number.isFinite(growMult) && growMult > 0;
  const effectiveGrowMult = growMultValid ? growMult : 1.0;
  const growingApplied = inGrowing && growMultValid && effectiveGrowMult !== 1.0;
  const dormancyApplied = !inGrowing && growMultValid && effectiveGrowMult !== 1.0;

  const raw = baseInterval * heatingMod * effectiveGrowMult;
  const interval = Math.max(Math.round(raw), 1);
  const intervalChanged = interval !== baseInterval;

  const parts: string[] = [];
  if (heatingApplied) parts.push(`heating ×${heatingMod}`);
  if (growingApplied) parts.push(`growing ×${effectiveGrowMult}`);
  if (dormancyApplied) parts.push(`dormancy ×${effectiveGrowMult}`);
  const reason = parts.length
    ? `Seasonal adjustment: interval ${baseInterval} → ${interval} (${parts.join(', ')})`
    : '';

  return {
    interval,
    heatingApplied,
    growingApplied,
    dormancyApplied,
    reason,
    intervalChanged,
  };
}
