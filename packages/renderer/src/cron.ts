import cron from 'node-cron';
import { pushToTrmnl } from './push.js';
import { screenCache } from './cache.js';

interface ScreenTodayResponse {
  type: 'watering' | 'rest';
  date: string;
  // watering day fields
  plants?: unknown[];
  nextWatering?: unknown;
  // rest day fields
  fact?: unknown;
  ornamentPath?: string;
  overduePlants?: unknown[];
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

  const data = (await response.json()) as ScreenTodayResponse;

  let html: string;

  // 2. Render based on screen type
  if (data.type === 'watering') {
    const { renderWateringDay } = await import('./render/watering-day.js');
    html = renderWateringDay(
      data.date,
      (data.plants ?? []) as Parameters<typeof renderWateringDay>[1],
      (data.nextWatering ?? null) as Parameters<typeof renderWateringDay>[2],
    );
  } else if (data.type === 'rest') {
    const { renderRestDay } = await import('./render/rest-day.js');
    html = renderRestDay(
      data.date,
      (data.fact ?? {}) as Parameters<typeof renderRestDay>[1],
      data.ornamentPath ?? '',
      (data.nextWatering ?? null) as Parameters<typeof renderRestDay>[3],
      (data.overduePlants ?? []) as Parameters<typeof renderRestDay>[4],
    );
  } else {
    throw new Error(`Unknown screen type: ${(data as ScreenTodayResponse).type}`);
  }

  // 3. Push to TRMNL
  const pushResult = await pushToTrmnl(html, trmnlApiKey, trmnlPluginUuid);
  if (!pushResult.success) {
    const detail = pushResult.error ?? `status ${pushResult.status}`;
    console.error(`[cron] TRMNL push failed: ${detail}`);
  } else {
    console.log(`[cron] TRMNL push succeeded (${pushResult.status})`);
  }

  // 4. Cache the rendered HTML regardless of push outcome
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
