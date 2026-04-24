export interface Config {
  port: number;
  databasePath: string;
  backupDir: string;
  assetsDir: string;
  calibrationDeadlineHour: number;
  n8nWebhookUrl: string;
  n8nMaxRetries: number;
  heatingSeasonStart: { month: number; day: number };
  heatingSeasonEnd: { month: number; day: number };
  // #36 — dry-soil-aware calibration + seasonal multiplier
  growingSeasonStart: { month: number; day: number };
  growingSeasonEnd: { month: number; day: number };
  dryDaysBase: number;
  growingSeasonMultiplier: number;
  dormancyMultiplier: number;
}

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function parseMonthDay(val: string): { month: number; day: number } {
  const [month, day] = val.split('-').map(Number);
  return { month, day };
}

function parsePositiveFloat(val: string | undefined, fallback: number): number {
  if (val == null || val === '') return fallback;
  const n = Number.parseFloat(val);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function parsePositiveInt(val: string | undefined, fallback: number, min: number): number {
  if (val == null || val === '') return fallback;
  const n = Number.parseInt(val, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(n, min);
}

export function loadConfig(): Config {
  return {
    port: parseInt(process.env.PORT_API || '3900', 10),
    databasePath: required('DATABASE_PATH'),
    backupDir: process.env.BACKUP_DIR || '/backups',
    assetsDir: process.env.ASSETS_DIR || '/app/assets',
    calibrationDeadlineHour: parseInt(process.env.CALIBRATION_DEADLINE_HOUR || '12', 10),
    n8nWebhookUrl: required('N8N_ENRICHMENT_WEBHOOK_URL'),
    n8nMaxRetries: parseInt(process.env.N8N_ENRICHMENT_MAX_RETRIES || '10', 10),
    heatingSeasonStart: parseMonthDay(process.env.HEATING_SEASON_START || '10-01'),
    heatingSeasonEnd: parseMonthDay(process.env.HEATING_SEASON_END || '04-01'),
    growingSeasonStart: parseMonthDay(process.env.GROWING_SEASON_START || '04-01'),
    growingSeasonEnd: parseMonthDay(process.env.GROWING_SEASON_END || '09-30'),
    dryDaysBase: parsePositiveInt(process.env.DRY_DAYS_BASE, 7, 2),
    growingSeasonMultiplier: parsePositiveFloat(process.env.GROWING_SEASON_MULTIPLIER, 0.8),
    dormancyMultiplier: parsePositiveFloat(process.env.DORMANCY_MULTIPLIER, 1.3),
  };
}
