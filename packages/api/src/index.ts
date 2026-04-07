import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { loadConfig } from './config.js';
import { createDatabase } from './database/connection.js';
import { seedFacts } from './database/seed.js';
import { performBackup } from './database/backup.js';
import { createPlantsRouter } from './routes/plants.js';
import { createCalibrationRouter } from './routes/calibration.js';
import { createConditionsRouter } from './routes/conditions.js';
import { createFactsRouter } from './routes/facts.js';
import { createScreenRouter } from './routes/screen.js';
import { createVacationRouter } from './routes/vacation.js';
import { createEnrichmentRouter } from './enrichment/callback.js';

const config = loadConfig();
const db = createDatabase(config.databasePath);

seedFacts(db, []);

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'plant-api' });
});

// API routes
app.use('/api/plants', createPlantsRouter(db));
app.use('/api', createCalibrationRouter(db));
app.use('/api', createConditionsRouter(db));
app.use('/api', createFactsRouter(db));
app.use(
  '/api',
  createScreenRouter(db, {
    heatingSeasonStart: config.heatingSeasonStart,
    heatingSeasonEnd: config.heatingSeasonEnd,
  })
);
app.use('/api/vacation', createVacationRouter(db));
app.use('/api/enrichment', createEnrichmentRouter(db));

// Static client files (built output from packages/api/client)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientPath = path.join(__dirname, 'client');

app.use(express.static(clientPath));

// Client-side routing fallback — must be last
app.get('*', (_req, res) => {
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
