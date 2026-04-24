/**
 * Calibration mechanics for the dry-soil target interval (#36).
 *
 * `currentInterval` / the plant's `current_interval` column is treated as the
 * **dry-days target** — "how many days of dry soil we want before the next
 * watering." The per-answer nudge is unchanged:
 *
 *   1 (bone dry)   → shorten by 1 day (soil dried out too fast → water sooner)
 *   2 (dry)        → shorten by 1 day
 *   3 (just right) → no change (this is what converges)
 *   4 (wet)        → lengthen by 1 day (soil was still moist → wait longer)
 *   5 (soaking)    → lengthen by 2 days
 *
 * The semantic shift from "days between waterings" to "dry-days target" is
 * noted in docs/plans/2026-04-24-issue-36-design.md. No DB migration needed —
 * the existing `current_interval` column holds the same number, just renamed
 * conceptually.
 */
const MIN_DRY_DAYS = 2;

export function adjustInterval(currentInterval: number, answer: number): number {
  let newInterval = currentInterval;
  if (answer <= 2) {
    newInterval = currentInterval - 1;
  } else if (answer === 4) {
    newInterval = currentInterval + 1;
  } else if (answer === 5) {
    newInterval = currentInterval + 2;
  }
  return Math.max(newInterval, MIN_DRY_DAYS);
}

export function checkConvergence(recentAnswers: number[]): boolean {
  if (recentAnswers.length < 3) return false;
  const lastThree = recentAnswers.slice(-3);
  return lastThree.every(a => a === 3);
}
