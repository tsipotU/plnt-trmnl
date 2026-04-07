# Plant TRMNL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a plant care system with a TRMNL e-ink display (800x480, grayscale) and a mobile-first web app for managing plants, calibrating watering schedules, and tracking conditions.

**Architecture:** Two Docker containers (OrbStack) — `plant-api` (Express + SQLite + React web UI, port 3900) and `plant-renderer` (stateless Express, daily cron renders screen + pushes to TRMNL webhook API, port 3901). n8n handles plant enrichment via Claude Max.

**Tech Stack:** Node.js 25, TypeScript, Express, better-sqlite3 (WAL mode), React 19 + Vite, node-cron, Docker Compose, TRMNL webhook API, n8n.

**Spec:** `docs/specs/2026-04-07-plant-trmnl-design.md`

---

## Phase 0: Project Scaffolding

### Task 1: Root Project Setup

**Files:**
- Create: `package.json` (root workspace)
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `CLAUDE.md`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "plant-trmnl",
  "private": true,
  "workspaces": ["packages/api", "packages/renderer"],
  "scripts": {
    "dev:api": "npm -w packages/api run dev",
    "dev:renderer": "npm -w packages/renderer run dev",
    "test": "npm -w packages/api test && npm -w packages/renderer test",
    "test:api": "npm -w packages/api test",
    "test:renderer": "npm -w packages/renderer test",
    "build": "npm -w packages/api run build && npm -w packages/renderer run build",
    "docker:up": "docker compose up --build -d",
    "docker:down": "docker compose down",
    "docker:logs": "docker compose logs -f"
  }
}
```

- [ ] **Step 2: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
dist/
.env
*.db
*.db-wal
*.db-shm
.superpowers/
.DS_Store
```

- [ ] **Step 4: Create .env.example**

Copy every env var from the spec's Environment Variables section with placeholder values. No real secrets.

- [ ] **Step 5: Create CLAUDE.md**

Include: project overview, tech stack, directory layout, key conventions (TDD, no hardcoded secrets, env validation on startup, WAL mode for SQLite, all scheduling queries filter `WHERE archived = 0`), and link to the design spec.

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.base.json .gitignore .env.example CLAUDE.md
git commit -m "chore: project scaffolding — root workspace, tsconfig, env template, CLAUDE.md"
```

---

### Task 2: Framework Goal Docs

**Files:**
- Create: `.agents/goals/build-app.md` (ATLAS workflow adapted for Plant TRMNL)
- Create: `.agents/goals/manage-project.md` (GROOM workflow)
- Create: `.agents/goals/qa.md` (FINE workflow)

- [ ] **Step 1: Create build-app.md**

Adapt the ATLAS workflow from [private-repo] (source: `[redacted-path]/Projects/[private-repo]/.agents/goals/build-app.md`). Replace all Baristi-specific references with Plant TRMNL equivalents: Docker Compose for orchestration, n8n for enrichment, TRMNL webhook API for display, SQLite for data.

- [ ] **Step 2: Create manage-project.md**

Adapt the GROOM workflow from [private-repo] (source: `[redacted-path]/Projects/[private-repo]/.agents/goals/manage-project.md`). GitHub issues + milestones, same 5-step process.

- [ ] **Step 3: Create qa.md**

Adapt FINE from [private-repo] (source: `[redacted-path]/Projects/[private-repo]/.agents/goals/qa.md`). Focus on mobile web: touch targets >= 44px, calibration modal one-handed, iPhone Safari compatibility, dark theme contrast ratios.

- [ ] **Step 4: Commit**

```bash
git add .agents/
git commit -m "docs: add GOTCHA framework goal docs — ATLAS, GROOM, FINE adapted for Plant TRMNL"
```

---

### Task 3: Package Setup — API

**Files:**
- Create: `packages/api/package.json`
- Create: `packages/api/tsconfig.json`
- Create: `packages/api/src/index.ts` (minimal Express hello-world)

- [ ] **Step 1: Create packages/api/package.json**

```json
{
  "name": "@plant-trmnl/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "cors": "^2.8.5",
    "express": "^5.0.0",
    "node-cron": "^3.0.3",
    "pino": "^9.0.0",
    "pino-pretty": "^11.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/cors": "^2.8.0",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create packages/api/tsconfig.json** extending base.

- [ ] **Step 3: Create minimal packages/api/src/index.ts**

```typescript
import express from 'express';

const app = express();
const PORT = parseInt(process.env.PORT_API || '3900', 10);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'plant-api' });
});

app.listen(PORT, () => {
  console.log(`plant-api listening on :${PORT}`);
});
```

- [ ] **Step 4: Install dependencies and verify the health endpoint responds**

- [ ] **Step 5: Commit**

```bash
git add packages/api/
git commit -m "chore: api package setup — Express, TypeScript, health endpoint"
```

---

### Task 4: Package Setup — Renderer

**Files:**
- Create: `packages/renderer/package.json`
- Create: `packages/renderer/tsconfig.json`
- Create: `packages/renderer/src/index.ts`

Same pattern as Task 3 but for the renderer (port 3901, service name `plant-renderer`). Dependencies: express, node-cron, pino.

- [ ] **Step 1-5: Same flow as Task 3** — package.json, tsconfig, minimal index.ts, install, verify, commit.

---

### Task 5: Docker Compose + Dockerfiles

**Files:**
- Create: `docker-compose.yml`
- Create: `packages/api/Dockerfile`
- Create: `packages/renderer/Dockerfile`

- [ ] **Step 1: Create packages/api/Dockerfile** — multi-stage build (builder + runtime), EXPOSE 3900.

- [ ] **Step 2: Create packages/renderer/Dockerfile** — same pattern, EXPOSE 3901.

- [ ] **Step 3: Create docker-compose.yml** — two services on `plant-net` bridge network. API has volumes for `db-data:/data`, `~/Backups/plant-trmnl:/backups`, `./assets:/app/assets:ro`. Renderer depends on API (service_healthy). Both have healthcheck and `restart: unless-stopped`. Both set `TZ=Europe/Amsterdam`.

- [ ] **Step 4: Test Docker build** — `docker compose build` succeeds.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml packages/api/Dockerfile packages/renderer/Dockerfile
git commit -m "infra: Docker Compose + multi-stage Dockerfiles for API and renderer"
```

---

## Phase 1: Database + Config

### Task 6: API Config Validation

**Files:**
- Create: `packages/api/src/config.ts`
- Create: `packages/api/src/config.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/api/src/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns valid config when all required vars are set', () => {
    process.env.PORT_API = '3900';
    process.env.DATABASE_PATH = '/data/test.db';
    process.env.BACKUP_DIR = '/backups';
    process.env.CALIBRATION_DEADLINE_HOUR = '12';
    process.env.N8N_ENRICHMENT_WEBHOOK_URL = 'http://n8n/webhook';
    process.env.N8N_ENRICHMENT_MAX_RETRIES = '10';
    process.env.HEATING_SEASON_START = '10-01';
    process.env.HEATING_SEASON_END = '04-01';

    const config = loadConfig();
    expect(config.port).toBe(3900);
    expect(config.databasePath).toBe('/data/test.db');
    expect(config.calibrationDeadlineHour).toBe(12);
    expect(config.heatingSeasonStart).toEqual({ month: 10, day: 1 });
  });

  it('throws when required var is missing', () => {
    delete process.env.DATABASE_PATH;
    expect(() => loadConfig()).toThrow('DATABASE_PATH');
  });

  it('uses defaults for optional vars', () => {
    process.env.DATABASE_PATH = '/data/test.db';
    process.env.N8N_ENRICHMENT_WEBHOOK_URL = 'http://n8n/webhook';
    const config = loadConfig();
    expect(config.port).toBe(3900);
    expect(config.calibrationDeadlineHour).toBe(12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Write config.ts** — `loadConfig()` reads env vars, validates required ones, parses heating season month-day strings, returns typed Config object.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/config*
git commit -m "feat(api): config validation — required env vars, defaults, heating season parsing"
```

---

### Task 7: SQLite Schema

**Files:**
- Create: `packages/api/src/database/schema.ts`
- Create: `packages/api/src/database/schema.test.ts`
- Create: `packages/api/src/database/connection.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/api/src/database/schema.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeSchema } from './schema.js';

describe('initializeSchema', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('creates all required tables', () => {
    initializeSchema(db);
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as { name: string }[];
    const names = tables.map(t => t.name);
    expect(names).toContain('plants');
    expect(names).toContain('calibration_questions');
    expect(names).toContain('calibrations');
    expect(names).toContain('plant_conditions');
    expect(names).toContain('facts');
    expect(names).toContain('decorative_ornaments');
    expect(names).toContain('event_log');
    expect(names).toContain('enrichment_queue');
    expect(names).toContain('app_state');
  });

  it('is idempotent — can run twice without error', () => {
    initializeSchema(db);
    expect(() => initializeSchema(db)).not.toThrow();
  });

  it('enables WAL mode', () => {
    initializeSchema(db);
    const result = db.pragma('journal_mode') as { journal_mode: string }[];
    expect(result[0].journal_mode).toBe('wal');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Write schema.ts** — `initializeSchema(db)` sets WAL mode, enables foreign keys, creates all 9 tables with `CREATE TABLE IF NOT EXISTS` matching the spec's data model exactly. Write connection.ts as a thin wrapper that creates the DB and calls initializeSchema.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/database/
git commit -m "feat(api): SQLite schema — all 9 tables with WAL mode and foreign keys"
```

---

### Task 8: Seed Facts Database

**Files:**
- Create: `assets/seed-facts.json` (150 plant facts)
- Create: `packages/api/src/database/seed.ts`
- Create: `packages/api/src/database/seed.test.ts`

- [ ] **Step 1: Generate seed-facts.json** — 150 unique plant facts as a JSON string array.

- [ ] **Step 2: Write the failing test** — test that seedFacts inserts all facts with `source = 'seed'` and `plant_id = null`, and that it is idempotent (no duplicates on re-run).

- [ ] **Step 3: Write seed.ts** — `seedFacts(db, facts[])` checks existing seed facts, inserts only new ones in a transaction.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add assets/seed-facts.json packages/api/src/database/seed*
git commit -m "feat(api): seed 150 plant facts on first run"
```

---

## Phase 2: Core Scheduling Logic

### Task 9: Water Amount Calculation

**Files:**
- Create: `packages/api/src/scheduling/water-calculator.ts`
- Create: `packages/api/src/scheduling/water-calculator.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { calculateWaterAmount, isHeatingSeasonActive } from './water-calculator.js';

describe('calculateWaterAmount', () => {
  it('calculates correct amount for Monstera in 25cm pot', () => {
    const ml = calculateWaterAmount({
      potSizeCm: 25, waterRatio: 0.035,
      isHeatingSeason: false, heatingSeasonModifier: 0.85,
    });
    // pi * 12.5^2 * 21.25 * 0.035 = ~365ml
    expect(ml).toBeGreaterThan(350);
    expect(ml).toBeLessThan(380);
  });

  it('applies heating season modifier', () => {
    const normal = calculateWaterAmount({
      potSizeCm: 25, waterRatio: 0.035,
      isHeatingSeason: false, heatingSeasonModifier: 0.85,
    });
    const heating = calculateWaterAmount({
      potSizeCm: 25, waterRatio: 0.035,
      isHeatingSeason: true, heatingSeasonModifier: 0.85,
    });
    expect(heating).toBeCloseTo(normal * 0.85, 0);
  });
});

describe('isHeatingSeasonActive', () => {
  it('returns true in January', () => {
    expect(isHeatingSeasonActive(
      new Date('2026-01-15'), { month: 10, day: 1 }, { month: 4, day: 1 }
    )).toBe(true);
  });

  it('returns false in July', () => {
    expect(isHeatingSeasonActive(
      new Date('2026-07-15'), { month: 10, day: 1 }, { month: 4, day: 1 }
    )).toBe(false);
  });

  it('returns true in November', () => {
    expect(isHeatingSeasonActive(
      new Date('2026-11-15'), { month: 10, day: 1 }, { month: 4, day: 1 }
    )).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Write water-calculator.ts** — `calculateWaterAmount({potSizeCm, waterRatio, isHeatingSeason, heatingSeasonModifier})` computes `pi * r^2 * depth * ratio * seasonMod`. `isHeatingSeasonActive(date, start, end)` handles year-wrapping comparison.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/scheduling/water-calculator*
git commit -m "feat(api): water amount calculation with heating season support"
```

---

### Task 10: Calibration Interval Adjustment

**Files:**
- Create: `packages/api/src/scheduling/calibration.ts`
- Create: `packages/api/src/scheduling/calibration.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { adjustInterval, checkConvergence } from './calibration.js';

describe('adjustInterval', () => {
  it('shortens by 1 for answer 1 (bone dry)', () => {
    expect(adjustInterval(7, 1)).toBe(6);
  });
  it('shortens by 1 for answer 2', () => {
    expect(adjustInterval(7, 2)).toBe(6);
  });
  it('keeps interval for answer 3', () => {
    expect(adjustInterval(7, 3)).toBe(7);
  });
  it('extends by 1 for answer 4', () => {
    expect(adjustInterval(7, 4)).toBe(8);
  });
  it('extends by 2 for answer 5 (soaking)', () => {
    expect(adjustInterval(7, 5)).toBe(9);
  });
  it('enforces minimum of 2 days', () => {
    expect(adjustInterval(2, 1)).toBe(2);
  });
});

describe('checkConvergence', () => {
  it('true after 3 consecutive 3s', () => {
    expect(checkConvergence([3, 3, 3])).toBe(true);
  });
  it('false with only 2', () => {
    expect(checkConvergence([3, 3])).toBe(false);
  });
  it('false if last was not 3', () => {
    expect(checkConvergence([3, 3, 4])).toBe(false);
  });
  it('checks only last 3', () => {
    expect(checkConvergence([4, 3, 3, 3])).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Write calibration.ts** — `adjustInterval(current, answer)` applies rules (1-2: -1, 3: no change, 4: +1, 5: +2, min 2). `checkConvergence(answers[])` checks last 3 are all 3.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/scheduling/calibration*
git commit -m "feat(api): calibration interval adjustment with convergence detection"
```

---

### Task 11: Bin-Packer

**Files:**
- Create: `packages/api/src/scheduling/bin-packer.ts`
- Create: `packages/api/src/scheduling/bin-packer.test.ts`

- [ ] **Step 1: Write the failing test**

Test cases: ideal date available (returns it), 1 plant on date (still fits), 2 plants on date (shifts), prefers same-location grouping, falls back to ideal if all +/-3 days are full.

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Write bin-packer.ts** — `findBestDate(idealDate, location, interval, existingSchedule[])`. Searches +/-1 to +/-3 days, scores by proximity and location match. Max 2 per day. Returns ideal date as fallback if nothing available.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/scheduling/bin-packer*
git commit -m "feat(api): bin-packer — max 2 plants per day with location-aware grouping"
```

---

### Task 12: Scheduling Engine

**Files:**
- Create: `packages/api/src/scheduling/engine.ts`
- Create: `packages/api/src/scheduling/engine.test.ts`

- [ ] **Step 1: Write the failing test**

Test: `calculateNextWaterDate('2026-04-07', 7)` returns `'2026-04-14'`. Test month boundary crossing. Test `calculateRepotAdjustment(7, 20, 30)` increases interval with dampened scaling. Test `isFertilizerDue` returns false during heating season, true when enough weeks passed.

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Write engine.ts** — `calculateNextWaterDate(lastWatered, interval)`, `calculateRepotAdjustment(currentInterval, oldPot, newPot)` using `(newVol/oldVol)^0.3`, `isFertilizerDue(lastFertilized, intervalWeeks, today, isHeatingSeason)`.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/scheduling/engine*
git commit -m "feat(api): scheduling engine — next water date, repot adjustment, fertilizer check"
```

---

## Phase 3: API Routes

### Task 13: Event Logger

**Files:**
- Create: `packages/api/src/database/event-log.ts`
- Create: `packages/api/src/database/event-log.test.ts`

- [ ] **Step 1: Write test** — log an event, retrieve it, verify fields. Test with old/new values.

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Write event-log.ts** — `logEvent(db, {plantId, eventType, oldValue?, newValue?, reason})` and `getEventsForPlant(db, plantId, limit)`.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/database/event-log*
git commit -m "feat(api): event logging — structured audit trail for all plant events"
```

---

### Task 14: Plant CRUD Routes

**Files:**
- Create: `packages/api/src/routes/plants.ts`
- Create: `packages/api/src/routes/plants.test.ts`

Implement Express routes:
- `GET /api/plants` — list active plants (`WHERE archived = 0`)
- `GET /api/plants/:id` — single plant with conditions, next calibration question
- `POST /api/plants` — create (includes `lastWateredAt`, calculates `nextWaterDate`)
- `PUT /api/plants/:id` — update (detects pot size change for repot logic)
- `POST /api/plants/:id/water` — mark watered (resets schedule from today)
- `POST /api/plants/:id/archive` — soft-delete

- [ ] **Step 1: Write tests** using supertest — list returns only active, create sets next_water_date, water resets schedule, archive excludes from list, pot size change triggers repot event.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement routes** — each handler queries SQLite, uses scheduling functions from Phase 2, calls logEvent.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routes/plants*
git commit -m "feat(api): plant CRUD routes — create, list, update, water, archive"
```

---

### Task 15: Calibration Routes

**Files:**
- Create: `packages/api/src/routes/calibration.ts`
- Create: `packages/api/src/routes/calibration.test.ts`

Implement:
- `GET /api/plants/:id/calibration/next` — next question (rotation via calibration_cycle, respects convergence)
- `POST /api/plants/:id/calibration` — submit answer, adjust interval, check convergence
- `GET /api/calibration/due` — all plants needing calibration today

- [ ] **Step 1: Write tests** — question rotation, convergence skipping (every 3rd), interval adjustment, convergence detection.

- [ ] **Step 2-4: TDD cycle**

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routes/calibration*
git commit -m "feat(api): calibration routes — question rotation, convergence, interval adjustment"
```

---

### Task 16: Conditions Routes

**Files:**
- Create: `packages/api/src/routes/conditions.ts`
- Create: `packages/api/src/routes/conditions.test.ts`

Implement: `GET /api/plants/:id/conditions`, `POST /api/plants/:id/conditions`, `POST /api/conditions/:id/resolve`.

- [ ] **Step 1-5: TDD cycle** — create sets detected_via 'manual', resolve sets resolved_at, list shows active first.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/conditions*
git commit -m "feat(api): condition routes — flag, list, resolve plant conditions"
```

---

### Task 17: Facts Routes

**Files:**
- Create: `packages/api/src/routes/facts.ts`
- Create: `packages/api/src/routes/facts.test.ts`

Implement: `GET /api/facts` (searchable), `GET /api/facts/next` (rotation + increment shown_count), `POST /api/facts/:id/disable`.

- [ ] **Step 1-5: TDD cycle** — rotation serves lowest shown_count, disable removes from rotation, search filters.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/facts*
git commit -m "feat(api): facts routes — rotation, search, disable"
```

---

### Task 18: Screen Data Endpoint

**Files:**
- Create: `packages/api/src/routes/screen.ts`
- Create: `packages/api/src/routes/screen.test.ts`

`GET /api/screen/today` — internal endpoint for renderer. Returns JSON with screen type and all render data.

- [ ] **Step 1: Write tests** — watering day with 1 plant, 2 plants, rest day, rest day with overdue, vacation mode forces rest day.

- [ ] **Step 2-4: TDD cycle** — queries plants due today (archived=0), computes water amounts, selects calibration questions, picks fact + ornament for rest days, checks vacation from app_state.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routes/screen*
git commit -m "feat(api): screen data endpoint — daily render payload for renderer"
```

---

### Task 19: Vacation Mode

**Files:**
- Create: `packages/api/src/scheduling/vacation.ts`
- Create: `packages/api/src/scheduling/vacation.test.ts`
- Create: `packages/api/src/routes/vacation.ts`

Implement: `POST /api/vacation` (set), `DELETE /api/vacation` (end early), `GET /api/vacation` (status). On end: recalculate all next_water_date from return date, bin-pack.

- [ ] **Step 1-5: TDD cycle**

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/scheduling/vacation* packages/api/src/routes/vacation*
git commit -m "feat(api): vacation mode — set, end early, schedule recalculation on return"
```

---

## Phase 4: Enrichment

### Task 20: n8n Webhook + Callback

**Files:**
- Create: `packages/api/src/enrichment/webhook.ts`
- Create: `packages/api/src/enrichment/callback.ts`
- Create: `packages/api/src/enrichment/webhook.test.ts`

`fireEnrichmentWebhook(plantId, plantData)` POSTs to n8n. `POST /api/enrichment/callback` receives result, stores plant fields + questions + conditions + facts + illustration.

- [ ] **Step 1: Write tests** — mock fetch for webhook. Test callback stores data and sets enrichment_status to 'complete'.

- [ ] **Step 2-5: TDD cycle**

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/enrichment/*
git commit -m "feat(api): n8n enrichment webhook + callback"
```

---

### Task 21: Enrichment Retry Queue

**Files:**
- Create: `packages/api/src/enrichment/retry.ts`
- Create: `packages/api/src/enrichment/retry.test.ts`

`processRetryQueue(db)` — retries pending enrichments every 15 min. Max attempts from config. Marks failed after threshold.

- [ ] **Step 1-5: TDD cycle**

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/enrichment/retry*
git commit -m "feat(api): enrichment retry queue — 15min cron, max attempts, failure handling"
```

---

## Phase 5: Renderer

### Task 22: Renderer Config

**Files:**
- Create: `packages/renderer/src/config.ts`
- Create: `packages/renderer/src/config.test.ts`

Validate: PORT_RENDERER, API_INTERNAL_URL, RENDER_CRON, TRMNL_API_KEY, TRMNL_PLUGIN_UUID.

- [ ] **Step 1-5: TDD cycle** — same pattern as Task 6.

- [ ] **Step 6: Commit**

```bash
git add packages/renderer/src/config*
git commit -m "feat(renderer): config validation"
```

---

### Task 23: Watering Day Screen Renderer

**Files:**
- Create: `packages/renderer/src/render/watering-day.ts`
- Create: `packages/renderer/src/render/watering-day.test.ts`

`renderWateringDay(data)` returns HTML string matching Lovable mockups (see `docs/mockups/watering-*.png`).

- [ ] **Step 1: Write tests** — 1-plant HTML contains plant name, water amount, calibration question. 2-plant has both. Converged plant shows "Soil: dialed in".

- [ ] **Step 2-5: TDD cycle** — dark header, cream background, card layout, img tag for illustration, serif names, calibration box with 1-5 scale, footer with next plant.

- [ ] **Step 6: Commit**

```bash
git add packages/renderer/src/render/watering-day*
git commit -m "feat(renderer): watering day screen — 1 and 2 card layouts"
```

---

### Task 24: Rest Day Screen Renderer

**Files:**
- Create: `packages/renderer/src/render/rest-day.ts`
- Create: `packages/renderer/src/render/rest-day.test.ts`

`renderRestDay(data)` returns HTML. See `docs/mockups/rest-day*.png`.

- [ ] **Step 1: Write tests** — normal has fact + next watering. Overdue shows badge. Multiple overdue shows "+N more".

- [ ] **Step 2-5: TDD cycle**

- [ ] **Step 6: Commit**

```bash
git add packages/renderer/src/render/rest-day*
git commit -m "feat(renderer): rest day screen — fact, ornament, overdue badges"
```

---

### Task 25: TRMNL Push + Daily Cron

**Files:**
- Create: `packages/renderer/src/push.ts`
- Create: `packages/renderer/src/push.test.ts`
- Create: `packages/renderer/src/cron.ts`
- Create: `packages/renderer/src/cache.ts`

- [ ] **Step 1: Write tests** — mock fetch for TRMNL push endpoint. Test cache set/get. Test cron flow: fetch screen data -> render -> push -> cache.

- [ ] **Step 2-5: TDD cycle** — `pushToTrmnl(markup)` POSTs to TRMNL webhook API. `cache.ts` stores current HTML + last push time. `cron.ts` orchestrates the daily flow.

- [ ] **Step 6: Wire into index.ts** — start cron on boot, add `/preview` route returning cached HTML, add `/health` with last push time.

- [ ] **Step 7: Commit**

```bash
git add packages/renderer/src/push* packages/renderer/src/cron* packages/renderer/src/cache* packages/renderer/src/index.ts
git commit -m "feat(renderer): TRMNL webhook push + daily cron + preview cache"
```

---

## Phase 6: Web App

### Task 26: Vite + React Setup

**Files:**
- Create: `packages/api/client/` (package.json, vite.config.ts, index.html, App.tsx, main.tsx, tsconfig.json)

- [ ] **Step 1: Create client package.json** — react, react-dom, react-router-dom, vite, @vitejs/plugin-react.

- [ ] **Step 2: Create vite.config.ts** — proxy `/api` to localhost:3900, build output to `../dist/client`.

- [ ] **Step 3: Create App.tsx** — React Router with routes: `/` (Dashboard), `/plants/:id` (Detail), `/add` (AddPlant), `/facts` (FactManagement), `/preview` (TrmnlPreview), `/setup` (TrmnlSetup).

- [ ] **Step 4: Set up dark theme CSS** — CSS custom properties, mobile-first (max-width 393px), jade-green accents on dark background.

- [ ] **Step 5: Wire static serving** — Express serves built client from `dist/client/` with catch-all for client-side routing.

- [ ] **Step 6: Commit**

```bash
git add packages/api/client/
git commit -m "feat(client): Vite + React 19 — router, dark theme, API proxy"
```

---

### Task 27: Dashboard Page

**Files:**
- Create: `packages/api/client/src/pages/Dashboard.tsx`
- Create: `packages/api/client/src/components/PlantCard.tsx`
- Create: `packages/api/client/src/components/VacationToggle.tsx`

- [ ] **Step 1: PlantCard** — thumbnail, name, next watering, status badges (overdue/pending/condition). Tap navigates.

- [ ] **Step 2: VacationToggle** — date picker, "Away until" / "End vacation now".

- [ ] **Step 3: Dashboard** — fetches GET /api/plants, renders list, Add Plant button, vacation toggle, archived section.

- [ ] **Step 4: Verify mobile viewport (393x852), touch targets >= 44px**

- [ ] **Step 5: Commit**

```bash
git add packages/api/client/src/pages/Dashboard.tsx packages/api/client/src/components/PlantCard.tsx packages/api/client/src/components/VacationToggle.tsx
git commit -m "feat(client): dashboard — plant list, status badges, vacation toggle"
```

---

### Task 28: Add Plant Flow

**Files:**
- Create: `packages/api/client/src/pages/AddPlant.tsx`

- [ ] **Step 1: Build form** — name input -> enrichment trigger -> loading state -> pre-filled editable form -> "When did you last water?" date picker (default today, "I don't know" = yesterday) -> Save.

- [ ] **Step 2: Wire to POST /api/plants**

- [ ] **Step 3: Handle enrichment failure** — empty form, "Enrichment pending" badge, manual fill.

- [ ] **Step 4: Commit**

```bash
git add packages/api/client/src/pages/AddPlant.tsx
git commit -m "feat(client): add plant flow — enrichment, pre-fill, last watered picker"
```

---

### Task 29: Plant Detail Page

**Files:**
- Create: `packages/api/client/src/pages/PlantDetail.tsx`

- [ ] **Step 1: Build page** — illustration, info fields (inline edit), "Mark as Watered" button, event timeline, conditions, "Archive" with confirmation.

- [ ] **Step 2: Pot size change** — confirm "Did you repot?" dialog, calls PUT with repot flag.

- [ ] **Step 3: Event timeline** — fetch events, render chronological.

- [ ] **Step 4: Commit**

```bash
git add packages/api/client/src/pages/PlantDetail.tsx
git commit -m "feat(client): plant detail — edit, water, archive, event timeline"
```

---

### Task 30: Calibration Modal

**Files:**
- Create: `packages/api/client/src/components/CalibrationModal.tsx`

- [ ] **Step 1: Build modal** — sequential per plant, thumbnail + question + slider 1-5 + scale labels, Submit/Skip, confirmation with interval change, Next/Done.

- [ ] **Step 2: Wire to Dashboard** — auto-show on mount when GET /api/calibration/due returns plants.

- [ ] **Step 3: Commit**

```bash
git add packages/api/client/src/components/CalibrationModal.tsx
git commit -m "feat(client): calibration modal — sequential, slider, convergence aware"
```

---

### Task 31: Fact Management + Conditions

**Files:**
- Create: `packages/api/client/src/pages/FactManagement.tsx`
- Create: `packages/api/client/src/components/ConditionForm.tsx`

- [ ] **Step 1: FactManagement** — searchable list, source badge, shown count, thumbs-down disable.

- [ ] **Step 2: ConditionForm** — pick from enriched list or custom, set severity, used in PlantDetail.

- [ ] **Step 3: Commit**

```bash
git add packages/api/client/src/pages/FactManagement.tsx packages/api/client/src/components/ConditionForm.tsx
git commit -m "feat(client): fact management + condition flagging"
```

---

### Task 32: TRMNL Preview + Setup Pages

**Files:**
- Create: `packages/api/client/src/pages/TrmnlPreview.tsx`
- Create: `packages/api/client/src/pages/TrmnlSetup.tsx`

- [ ] **Step 1: TrmnlPreview** — iframe/embedded div showing cached render HTML. "Updated daily at 05:00" note.

- [ ] **Step 2: TrmnlSetup** — plugin UUID display, API key status, last push timestamp, "Push now" test button.

- [ ] **Step 3: Commit**

```bash
git add packages/api/client/src/pages/TrmnlPreview.tsx packages/api/client/src/pages/TrmnlSetup.tsx
git commit -m "feat(client): TRMNL preview + setup pages"
```

---

## Phase 7: Infrastructure + Polish

### Task 33: SQLite Backup Cron

**Files:**
- Create: `packages/api/src/database/backup.ts`
- Create: `packages/api/src/database/backup.test.ts`

- [ ] **Step 1: Write test** — backup creates timestamped copy in backup dir.

- [ ] **Step 2: Implement** — daily midnight cron, `db.backup()` to `plant-trmnl-YYYY-MM-DD.db`, keep last 7, delete older.

- [ ] **Step 3: Wire into API index.ts**

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/database/backup*
git commit -m "feat(api): daily SQLite backup — 7-day retention"
```

---

### Task 34: Copy Mockups + Assets

**Files:**
- Create: `docs/mockups/` (copy from Downloads)
- Create: `assets/placeholder-plant.png`
- Create: `assets/ornaments/` (8-10 PNGs)

- [ ] **Step 1: Copy Lovable mockups** from ~/Downloads/ to docs/mockups/

- [ ] **Step 2: Create placeholder-plant.png** — generic botanical placeholder for unenriched plants.

- [ ] **Step 3: Create ornaments/** — 8-10 decorative botanical ornament PNGs in crosshatch style.

- [ ] **Step 4: Commit**

```bash
git add docs/mockups/ assets/
git commit -m "assets: mockups, placeholder plant, decorative ornaments"
```

---

### Task 35: README + GitHub Repo

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README** — overview, architecture (Mermaid diagram), tech stack, prerequisites, setup instructions, TRMNL device setup, development workflow, project structure.

- [ ] **Step 2: Create GitHub repo**

```bash
gh repo create plant-trmnl --private --source=. --push
```

- [ ] **Step 3: Create milestones** (Phase 0-7) and labels (api, renderer, client, infra, scheduling).

- [ ] **Step 4: Commit and push**

```bash
git add README.md
git commit -m "docs: README with architecture, setup, and project structure"
git push
```

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 0 | 1-5 | Project scaffolding, Docker, packages |
| 1 | 6-8 | Config, SQLite schema, seed facts |
| 2 | 9-12 | Water calc, calibration, bin-packing, scheduling engine |
| 3 | 13-19 | API routes (plants, calibration, conditions, facts, screen, vacation) |
| 4 | 20-21 | n8n enrichment webhook + retry queue |
| 5 | 22-25 | Renderer config, screen rendering, TRMNL push, daily cron |
| 6 | 26-32 | React web app (all pages and components) |
| 7 | 33-35 | Backup cron, assets, README, GitHub repo |

**Total: 35 tasks across 8 phases.**

Each phase produces working, testable software. Phase 2 is the intellectual core (scheduling algorithm) — get this right and everything else is plumbing.
