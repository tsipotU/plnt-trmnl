/**
 * Issue #38 — daily fact rotation cron schedule.
 *
 * Runs once per day at 06:00 local time. Exported as a constant so the
 * schedule string is testable in isolation (shape + hour assertions) without
 * touching node-cron.
 */
export const DAILY_FACT_CRON = '0 6 * * *';
