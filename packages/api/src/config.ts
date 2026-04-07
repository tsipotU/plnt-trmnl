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
  };
}
