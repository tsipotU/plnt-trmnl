import express from 'express';
import { loadRendererConfig } from './config.js';
import { startRenderCron, performDailyRender } from './cron.js';
import { screenCache } from './cache.js';

const config = loadRendererConfig();
const app = express();

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'plant-renderer',
    lastPushTime: screenCache.getLastPushTime(),
  });
});

app.get('/preview', (_req, res) => {
  const html = screenCache.get();
  if (!html) {
    res.status(404).json({ error: 'No screen cached yet' });
    return;
  }
  res.type('html').send(html);
});

app.post('/render', async (_req, res) => {
  try {
    await performDailyRender(config.apiInternalUrl, config.trmnlApiKey, config.trmnlPluginUuid);
    res.json({ success: true, lastPushTime: screenCache.getLastPushTime() });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

startRenderCron(config.renderCron, config.apiInternalUrl, config.trmnlApiKey, config.trmnlPluginUuid);

app.listen(config.port, () => {
  console.log(`plant-renderer listening on :${config.port}`);
});
