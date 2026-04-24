import dotenv from 'dotenv';
dotenv.config({ path: new URL('../../../.env', import.meta.url).pathname });
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { loadConfig } from './config.js';
import { createDatabase } from './database/connection.js';
import { seedFacts } from './database/seed.js';
import { seedOrnaments } from './database/seed-ornaments.js';
import { performBackup } from './database/backup.js';
import { createPlantsRouter } from './routes/plants.js';
import { createPlantNotesRouter } from './routes/plant-notes.js';
import { createCalibrationRouter } from './routes/calibration.js';
import { createConditionsRouter } from './routes/conditions.js';
import { createFactsRouter } from './routes/facts.js';
import { createCatalogRouter } from './routes/catalog.js';
import { loadCatalog } from './catalog/loader.js';
import { createScreenRouter } from './routes/screen.js';
import { createVacationRouter } from './routes/vacation.js';
import { createFeedbackRouter } from './routes/feedback.js';
import { createScheduleRouter } from './routes/schedule.js';
import { createEnrichmentRouter } from './enrichment/callback.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = loadConfig();
const db = createDatabase(config.databasePath);

const feedbackUploadDir = path.resolve(__dirname, '..', 'feedback-uploads');
fs.mkdirSync(feedbackUploadDir, { recursive: true });

const seedFactsPath = path.join(config.assetsDir, 'seed-facts.json');
if (fs.existsSync(seedFactsPath)) {
  const facts = JSON.parse(fs.readFileSync(seedFactsPath, 'utf-8'));
  seedFacts(db, facts);
}
seedOrnaments(db, path.join(config.assetsDir, 'ornaments'));

// Plant catalog (#1a) — read-only JSON, validated on boot, indexed in memory
const catalog = loadCatalog();

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'plant-api' });
});

// API routes
app.use('/api/plants', createPlantsRouter(db, {
  heatingSeasonStart: config.heatingSeasonStart,
  heatingSeasonEnd: config.heatingSeasonEnd,
}, catalog));
app.use('/api/plants', createPlantNotesRouter(db));
app.use('/api', createCalibrationRouter(db));
app.use('/api', createConditionsRouter(db));
app.use('/api', createFactsRouter(db));
app.use('/api/catalog', createCatalogRouter(catalog));
app.use(
  '/api',
  createScreenRouter(db, {
    heatingSeasonStart: config.heatingSeasonStart,
    heatingSeasonEnd: config.heatingSeasonEnd,
  })
);
app.use('/api/vacation', createVacationRouter(db));
app.use('/api/feedback', createFeedbackRouter(db, { uploadDir: feedbackUploadDir }));
app.use('/api/enrichment', createEnrichmentRouter(db));
app.use('/api/schedule', createScheduleRouter(db));

// Proxy renderer endpoints (avoids CORS from browser → renderer direct)
const rendererUrl = process.env.API_INTERNAL_URL?.replace(':3900', ':3901') || 'http://localhost:3901';
app.get('/api/trmnl/preview', async (_req, res) => {
  try {
    const resp = await fetch(`${rendererUrl}/preview`);
    if (!resp.ok) return res.status(resp.status).json({ error: `Renderer: ${resp.status}` });
    const html = await resp.text();
    res.type('html').send(html);
  } catch {
    res.status(502).json({ error: 'Cannot reach renderer' });
  }
});
app.post('/api/trmnl/render', async (_req, res) => {
  try {
    const resp = await fetch(`${rendererUrl}/render`, { method: 'POST' });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch {
    res.status(502).json({ error: 'Cannot reach renderer' });
  }
});

// Unknown /api/* routes return JSON 404 instead of being swallowed by the SPA fallback
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Static client files (built output from packages/api/client)
const clientPath = path.join(__dirname, '..', 'dist', 'client');

app.use(express.static(clientPath));

// Client-side routing fallback — must be last (Express 5 syntax)
app.get('{*path}', (_req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Daily backup at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const backupPath = await performBackup(db, config.backupDir);
    console.log(`Backup created: ${backupPath}`);
  } catch (err) {
    console.error('Backup failed:', err);
  }
});

app.listen(config.port, () => {
  console.log(`plant-api listening on :${config.port}`);
});
