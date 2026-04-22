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

## Gotchas

- `better-sqlite3` is synchronous — do not mix with async DB patterns
- The renderer container has no direct DB access — it only talks to the API
- TRMNL fetches the screenshot on its own schedule; the renderer pre-renders and serves a static image
- `CALIBRATION_DEADLINE_HOUR` controls the cutoff for same-day calibration (default: 12 = noon)
- Heating season affects watering frequency recommendations (`HEATING_SEASON_START` / `HEATING_SEASON_END`)
- In `index.ts`, the scoped `/api` 404 handler must be registered AFTER all API routers but BEFORE the SPA catch-all (`app.get('{*path}', ...)`). Without it, GETs to unknown `/api/*` paths fall through to the SPA fallback and return `index.html` with status 200 — surfacing as cryptic `Unexpected token '<'` JSON parse errors in the client.
