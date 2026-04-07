import cron from 'node-cron';
import { pushToTrmnl } from './push.js';
import { screenCache } from './cache.js';

interface ScreenPlant {
  name: string;
  species: string | null;
  location: string | null;
  potSizeCm: number | null;
  waterAmountMl: number;
  waterDescription: string | null;
  fertilizerDue: boolean;
  watchFor: string | null;
  illustrationPath: string | null;
  calibration: { questionText: string; scaleMinLabel: string; scaleMaxLabel: string } | { skip: true; reason: string };
}

interface ScreenData {
  type: 'watering' | 'rest';
  date: string;
  plants?: ScreenPlant[];
  nextWatering?: { name: string; date: string; interval: number } | null;
  fact?: { text: string };
  ornament?: { imagePath: string };
  overdue?: Array<{ name: string; daysOverdue: number }>;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function buildMergeVariables(data: ScreenData): Record<string, unknown> {
  const vars: Record<string, unknown> = {
    screen_type: data.type,
    date: formatDate(data.date),
  };

  if (data.type === 'watering' && data.plants) {
    vars.plant_count = data.plants.length;

    // Plant 1
    const p1 = data.plants[0];
    if (p1) {
      vars.p1_name = p1.name;
      vars.p1_species = p1.species || '';
      vars.p1_location = p1.location || '';
      vars.p1_pot_size = p1.potSizeCm ? `${p1.potSizeCm}cm pot` : '';
      vars.p1_water = `${p1.waterAmountMl}ml`;
      vars.p1_water_desc = p1.waterDescription || '';
      vars.p1_fertilizer = p1.fertilizerDue ? 'Yes' : 'No';
      vars.p1_watch_for = p1.watchFor || '';
      vars.p1_has_calibration = !('skip' in p1.calibration);
      if (!('skip' in p1.calibration)) {
        vars.p1_cal_question = p1.calibration.questionText;
        vars.p1_cal_min = p1.calibration.scaleMinLabel;
        vars.p1_cal_max = p1.calibration.scaleMaxLabel;
      }
    }

    // Plant 2
    const p2 = data.plants[1];
    if (p2) {
      vars.p2_name = p2.name;
      vars.p2_species = p2.species || '';
      vars.p2_location = p2.location || '';
      vars.p2_pot_size = p2.potSizeCm ? `${p2.potSizeCm}cm pot` : '';
      vars.p2_water = `${p2.waterAmountMl}ml`;
      vars.p2_water_desc = p2.waterDescription || '';
      vars.p2_fertilizer = p2.fertilizerDue ? 'Yes' : 'No';
      vars.p2_watch_for = p2.watchFor || '';
      vars.p2_has_calibration = !('skip' in p2.calibration);
      if (!('skip' in p2.calibration)) {
        vars.p2_cal_question = p2.calibration.questionText;
        vars.p2_cal_min = p2.calibration.scaleMinLabel;
        vars.p2_cal_max = p2.calibration.scaleMaxLabel;
      }
    }
  }

  if (data.type === 'rest') {
    vars.fact_text = data.fact?.text || '';
    vars.has_overdue = (data.overdue?.length ?? 0) > 0;
    if (data.overdue && data.overdue.length > 0) {
      vars.overdue_name = data.overdue[0].name;
      vars.overdue_days = data.overdue[0].daysOverdue;
      vars.overdue_extra = data.overdue.length > 1 ? `+${data.overdue.length - 1} more` : '';
    }
  }

  // Next watering (both screen types)
  if (data.nextWatering) {
    vars.next_name = data.nextWatering.name;
    vars.next_date = formatDate(data.nextWatering.date);
    vars.next_interval = data.nextWatering.interval;
    vars.has_next = true;
  } else {
    vars.has_next = false;
  }

  return vars;
}

export async function performDailyRender(
  apiUrl: string,
  trmnlApiKey: string,
  trmnlPluginUuid: string,
): Promise<void> {
  // 1. Fetch today's screen data from API
  const response = await fetch(`${apiUrl}/api/screen/today`);
  if (!response.ok) {
    throw new Error(`API responded with status ${response.status}`);
  }

  const data = (await response.json()) as ScreenData;

  // 2. Build merge variables for TRMNL
  const mergeVars = buildMergeVariables(data);

  // 3. Push data to TRMNL
  const pushResult = await pushToTrmnl(mergeVars, trmnlApiKey, trmnlPluginUuid);
  if (!pushResult.success) {
    const detail = pushResult.error ?? `status ${pushResult.status}`;
    console.error(`[cron] TRMNL push failed: ${detail}`);
  } else {
    console.log(`[cron] TRMNL push succeeded (${pushResult.status})`);
  }

  // 4. Also render HTML for local preview
  let html: string;
  if (data.type === 'watering') {
    const { renderWateringDay } = await import('./render/watering-day.js');
    html = renderWateringDay(
      data.date,
      (data.plants ?? []) as Parameters<typeof renderWateringDay>[1],
      (data.nextWatering ?? null) as Parameters<typeof renderWateringDay>[2],
    );
  } else {
    const { renderRestDay } = await import('./render/rest-day.js');
    html = renderRestDay(
      data.date,
      (data.fact ?? { text: '' }) as Parameters<typeof renderRestDay>[1],
      data.ornament?.imagePath ?? '',
      (data.nextWatering ?? null) as Parameters<typeof renderRestDay>[3],
      (data.overdue ?? []) as Parameters<typeof renderRestDay>[4],
    );
  }

  screenCache.set(html);
  console.log(`[cron] Daily render complete for ${data.date} (type=${data.type})`);
}

export function startRenderCron(
  cronSchedule: string,
  apiUrl: string,
  trmnlApiKey: string,
  trmnlPluginUuid: string,
): void {
  cron.schedule(cronSchedule, () => {
    performDailyRender(apiUrl, trmnlApiKey, trmnlPluginUuid).catch(err => {
      console.error('Daily render failed:', err);
    });
  });
  console.log(`[cron] Render cron scheduled: ${cronSchedule}`);
}
