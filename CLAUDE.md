# Plant TRMNL — Claude Code Guide

## Project Overview

**Plant TRMNL** is a plant care management system with two surfaces:
1. A **TRMNL e-ink display** showing a daily digest of plants needing attention
2. A **mobile web app** for quick watering/fertilizing logging on the go

## Tech Stack

- **Runtime:** Node.js 25 + TypeScript
- **API:** Express 5, better-sqlite3 (WAL mode)
- **Frontend:** React 19 + Vite
- **Infra:** Docker Compose, OrbStack

## Architecture

Two containers, both in the same Docker Compose network:

| Container | Port | Purpose |
|-----------|------|---------|
| `plant-api` | 3900 | REST API + SQLite database |
| `plant-renderer` | 3901 | TRMNL screenshot renderer + cron |

The renderer calls the API internally via `API_INTERNAL_URL=http://plant-api:3900`.

## Directory Layout

```
plant-trmnl/
  packages/
    api/          — Express API, SQLite, business logic
    renderer/     — React + Vite TRMNL renderer, screenshot cron
  docs/
    specs/        — Design specifications
    plans/        — Implementation plans
  docker-compose.yml
  package.json    — Root workspace
  tsconfig.base.json
```

## Key Conventions

### TDD — Tests First
Write tests using **vitest** before writing implementation code. No feature ships without tests.

### Config — No Hardcoded Secrets
All configuration via `.env`. Every env var must be validated on startup. Use `.env.example` as the reference.

### SQLite WAL Mode
The database runs in WAL mode for concurrent read support. Always open with:
```ts
db.pragma('journal_mode = WAL');
```

### Schema Migrations
`CREATE TABLE IF NOT EXISTS` does NOT alter existing tables — adding a column to a live database requires an explicit `ALTER TABLE ... ADD COLUMN`. Use the `addColumnIfMissing(db, table, column, definition)` helper at the bottom of `database/schema.ts`, which checks `PRAGMA table_info` first to stay idempotent. Add the column to the CREATE TABLE block AND a migration call at the bottom of `initializeSchema`.

### Archived Plants
All scheduling queries MUST filter archived plants:
```sql
WHERE archived = 0
```
Never show or act on archived plants in any scheduling logic.

### Logging
Use **pino** for structured JSON logging. No `console.log` in production code.

### Express 5 Error Handling
Express 5 uses promise-based middleware. Do NOT use callback-style error handlers. Use `async` route handlers — unhandled promise rejections propagate automatically.

## Reference Docs

- Design spec: `docs/specs/2026-04-07-plant-trmnl-design.md`
- Implementation plan: `docs/plans/2026-04-07-plant-trmnl-plan.md`

## Test Execution Rules (Resource Safety)

On 2026-04-23 (and 2026-04-22), unbounded Vitest parallelism on this Mac Mini consumed enough RAM to freeze the system and force an SSH-only recovery. See `docs/incidents/2026-04-23-vitest-resource-exhaustion.md`. Rules to prevent recurrence:

- Use `npm test` (= `vitest run`), never bare `vitest` or `--watch` on this headless machine. `test:watch` is explicit opt-in only.
- All vitest configs cap concurrency via `pool: 'forks'` + `maxForks: 2`. Do not remove or raise these caps without discussing trade-offs first.
- If a run exceeds 2 minutes, **check progress before assuming trouble**:
  - Is the test counter advancing? Is RSS sawtoothing (healthy) or monotonic (leak)?
  - High CPU + no progress → likely infinite loop. Use `sample <pid> 3` to confirm.
  - Low CPU + no progress → likely awaiting unmocked I/O (network, Claude Agent SDK, fs).
- Kill only after diagnosing — never on a blind timer.
- **Hard ceiling:** if total RSS across vitest processes exceeds 3GB, kill regardless. That's the system-safety line.
- Never spawn real Claude Agent SDK calls inside test suites without mocking — that path is how a single test can balloon to 800MB+.

## Gotchas

- `better-sqlite3` is synchronous — do not mix with async DB patterns
- The renderer container has no direct DB access — it only talks to the API
- TRMNL fetches the screenshot on its own schedule; the renderer pre-renders and serves a static image
- `CALIBRATION_DEADLINE_HOUR` controls the cutoff for same-day calibration (default: 12 = noon)
- **Heating season:** affects watering frequency recommendations (`HEATING_SEASON_START` / `HEATING_SEASON_END`). The seasonal multiplier is applied in the water handler when `isInHeatingSeason()` is true; only seasonal_adjustment event is logged if interval differs. See `packages/api/src/scheduling/seasonal.ts`.
- **Growing season + dormancy (#36):** `GROWING_SEASON_START/END` (default Apr 1–Sep 30) + `GROWING_SEASON_MULTIPLIER` (default 0.8) + `DORMANCY_MULTIPLIER` (default 1.3) + `DRY_DAYS_BASE` (default 7). Stacks multiplicatively with the per-plant `heating_season_modifier`: `effective = round(current_interval × heatingMod × growOrDormancyMult)`. Only one `seasonal_adjustment` event per watering; its `reason` enumerates which layers fired. `current_interval` is the "dry-days target" (unchanged column, new semantic). See `packages/api/src/scheduling/seasonal.ts` → `applySeasonalMultipliers()` and `docs/plans/2026-04-24-issue-36-design.md`.
- **Undo-water state:** Each water event stores `old_value` as JSON (old `last_watered_at`, `next_water_date`, `calibration_cycle`). The `POST /:id/undo-water` route restores state from this snapshot.
- **Archive soft-delete:** All scheduling queries must filter `WHERE archived = 0`. Species facts are soft-disabled when the last plant of a species is archived (checked in enrichment).
- **`createPlantsRouter()` signature:** May accept optional `heatingConfig` parameter (test fixtures can override season dates).
- In `index.ts`, the scoped `/api` 404 handler must be registered AFTER all API routers but BEFORE the SPA catch-all (`app.get('{*path}', ...)`). Without it, GETs to unknown `/api/*` paths fall through to the SPA fallback and return `index.html` with status 200 — surfacing as cryptic `Unexpected token '<'` JSON parse errors in the client.
- **Parallel agents:** agents share the working directory without worktree isolation, causing branch-clobbering and stale checkouts if 2+ agents run concurrently. Solution: serialize agents or explicitly set isolation in dispatcher config.
- **next_water_date mutations:** Any code path that writes `next_water_date` MUST funnel the target date through `scheduleNextWater(idealDate, location, existing)` from `scheduling/bin-packer.ts` AND call `logScheduleEvents(db, plantId, result)` so `overflow_rebalance` / `schedule_congested` events fire consistently. Wired call sites: `routes/plants.ts` (water + PUT repot), `routes/calibration.ts`, `enrichment/callback.ts`, `enrichment/claude-enrich.ts`, `scheduling/vacation.ts`. Single-water uses `waterPlant()` helper in `routes/plants.ts`; `POST /water-all` uses the same helper per plant. Note: `POST /api/plants` bypasses this on initial insert by design — enrichment runs the rebalance seconds later.
- **Test environments:** API vitest (`packages/api/vitest.config.ts`) runs in node env and excludes `client/**`. Client vitest (`packages/api/client/vitest.config.ts`) runs in jsdom with `@testing-library/react` + `jest-dom` matchers. Never run client `.test.tsx` files under the API runner — they'll crash with `ReferenceError: document is not defined`. If a new workspace is added, mirror the `exclude: ['client/**']` pattern.
- **Batch events & undo isolation:** `waterPlant()` passes `batchId` ONLY to `watered` + `seasonal_adjustment` events, never to `overflow_rebalance` / `schedule_congested`. This keeps `/undo-batch`'s `DELETE WHERE batch_id = ?` from destroying the rebalance audit trail. Overflow/congested events survive an undo by design.

## Wave 8 architecture — pull-based enrichment

After Wave 8, plant-trmnl has **zero in-process LLM code**. Adding a plant or flagging a condition no longer fires anything; the row's status flips to `pending` and waits for an external AI tool to call the enrichment endpoints. If you're confused why "nothing happens" after adding a plant, check the user's connected AI tool — that's where enrichment lives now.

Persistence helpers in `packages/api/src/enrichment/callback.ts` are agent-agnostic and shared by both the legacy `POST /api/enrichment/callback` and the new `POST /api/plants/:id/enrichment` alias via the top-level `handleCallback(db, plantId, body, res)` function. The router is mounted at `/api`, with internal routes `/enrichment/callback` and `/plants/:id/enrichment`. State machines: `plants.enrichment_status ∈ {pending, complete}` and `plant_conditions.care_update_status ∈ {not_needed, pending, complete}`.
