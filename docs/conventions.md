# Conventions & gotchas

The canonical reference for how this codebase works and the traps that
will bite you. Read this before your first PR. New gotchas land here as
they're discovered.

For the elevator pitch see [`README.md`](../README.md). For self-hosting
see [`INSTALL.md`](../INSTALL.md). For what's planned see
[`ROADMAP.md`](../ROADMAP.md). For what shipped see
[`CHANGELOG.md`](../CHANGELOG.md).

---

## What this is

**plnt-trmnl** (user-visible name **p7l**) is a houseplant care
companion with two surfaces:

1. A **TRMNL e-ink display** showing a daily digest of plants needing
   attention.
2. A **mobile-first web app** for quick watering / fertilizing logging.

## Tech stack

- **Runtime:** Node.js 24 (`.nvmrc` pinned) + TypeScript
- **API:** Express 5, better-sqlite3 (WAL mode)
- **Frontend:** React 19 + Vite, vitest + jsdom for client tests
- **Storybook:** v10 catalog of atoms + molecules, deployed to GitHub
  Pages on every push to `main`
- **Infra:** Docker Compose in production; `tsx watch` from the project
  root in dev

## Architecture

Two services in the same Docker Compose network. In dev they run
side-by-side as `tsx watch` processes from the project root.

| Service | Port | Purpose |
|---|---|---|
| `plant-api` | 3900 | REST API + SQLite database + serves the SPA from `dist/client/` |
| `plant-renderer` | 3901 | TRMNL screenshot renderer + push cron |

The renderer talks to the API over the Docker network via
`API_INTERNAL_URL=http://plant-api:3900` (in containers) or
`http://localhost:3900` (in dev).

### Enrichment is pull-based

plnt-trmnl owns plant state; an external AI tool (Claude Desktop
scheduled task is the canonical recipe) polls
`GET /api/plants?enrichment=pending` and
`GET /api/conditions?care_update=pending`, then POSTs back to
`/api/plants/:id/enrichment` and `/api/conditions/:id/care-update`.
**There is no in-process LLM.** If "nothing happens" after a user adds
a plant, check whether their AI tool is connected — that's where
enrichment lives.

Persistence helpers live in `packages/api/src/enrichment/callback.ts`;
`handleCallback(db, plantId, body, res)` is shared by both endpoints.

State machines:

- `plants.enrichment_status ∈ {pending, complete, failed}`. `failed` is
  legacy from the in-process era; new plants go pending → complete.
- `plant_conditions.care_update_status ∈ {not_needed, pending, complete}`.

## Directory layout

```
plnt-trmnl/
  packages/
    api/
      src/                    Express API source
      catalog/plants.json     444-species catalog (loaded + strict-validated on boot)
      client/                 React SPA source (NOT a separate workspace; vite/sharp resolve from inside)
      dist/client/            built SPA, served by Express
    renderer/                 TRMNL screenshot renderer + push cron
  docs/
    HANDOFF.md                current snapshot for any new contributor
    conventions.md            this file
    RELEASE-PROCESS.md        maintainer playbook
    incidents/                post-mortems (institutional memory)
    specs/                    current design specs
    plans/                    current wave plans
    archive/                  historical wave plans/specs (Waves 1-8)
    trmnl-templates/          Liquid templates for TRMNL plugin
  scripts/                    pre-public-flip hygiene scripts (Wave 8)
  ROADMAP.md                  Waves 9-14 forward plan
  CHANGELOG.md                what shipped when
  INSTALL.md                  community install guide
  README.md                   elevator pitch
  CLAUDE.md                   thin pointer for AI agents → this file
  docker-compose.yml
  package.json                root workspace
  tsconfig.base.json
```

## Core conventions

### TDD — tests first

Write tests using **vitest** before implementation. No feature ships
without tests.

### Config — no hardcoded secrets

All configuration via `.env`. Every env var must be validated on
startup. Use `.env.example` as the reference.

### SQLite WAL mode

The database runs in WAL mode for concurrent read support. Always open
with:

```ts
db.pragma('journal_mode = WAL');
```

### Schema migrations

`CREATE TABLE IF NOT EXISTS` does **not** alter existing tables —
adding a column to a live database requires an explicit
`ALTER TABLE ... ADD COLUMN`. Use the
`addColumnIfMissing(db, table, column, definition)` helper at the
bottom of `database/schema.ts`, which checks `PRAGMA table_info` first
to stay idempotent. Add the column to the `CREATE TABLE` block AND a
migration call at the bottom of `initializeSchema`.

### Archived plants

All scheduling queries MUST filter archived plants:

```sql
WHERE archived = 0
```

Never show or act on archived plants in any scheduling logic.

### Logging

Use **pino** for structured JSON logging. No `console.log` in
production code.

### Express 5 error handling

Express 5 uses promise-based middleware. Do **not** use callback-style
error handlers. Use `async` route handlers — unhandled promise
rejections propagate automatically.

### Catalog schema (strict at boot)

Adding new entries requires:

- All 12 valid categories: `foliage | flowering | succulents | cacti | indoor_trees | ferns | palms | air_plants | orchids | carnivorous | herbs | terrarium`
- Light enum: `low | medium | bright_indirect | direct` (in `care.light_preference`, `light_profile.{ideal,tolerance_min,tolerance_max}`)
- Exactly 15 conditions per entry, exactly 15 unique facts, exactly 4 placement_tips
- Unique slug across all entries (kebab-case)

If the loader fails to validate at boot the API will not start. The
full validator lives at `packages/api/src/catalog/loader.ts`.

## Test execution rules (resource safety)

On 2026-04-23 (and 2026-04-22), unbounded vitest parallelism on a
constrained machine consumed enough RAM to freeze the system and force
SSH-only recovery. See
[`docs/incidents/2026-04-23-vitest-resource-exhaustion.md`](incidents/2026-04-23-vitest-resource-exhaustion.md).
Rules to prevent recurrence:

- Use `npm test` (= `vitest run`), never bare `vitest` or `--watch` on
  a headless machine. `test:watch` is explicit opt-in only.
- All vitest configs cap concurrency via `pool: 'forks'` +
  `maxForks: 2`. Do not remove or raise these caps without discussing
  trade-offs first.
- If a run exceeds 2 minutes, **check progress before assuming
  trouble**:
  - Is the test counter advancing? Is RSS sawtoothing (healthy) or
    monotonic (leak)?
  - High CPU + no progress → likely infinite loop. Use
    `sample <pid> 3` to confirm.
  - Low CPU + no progress → likely awaiting unmocked I/O.
- Kill only after diagnosing — never on a blind timer.
- **Hard ceiling:** if total RSS across vitest processes exceeds 3GB,
  kill regardless. That's the system-safety line.

## Gotchas

### Database & scheduling

- `better-sqlite3` is synchronous — do not mix with async DB patterns.
- **`next_water_date` mutations** must funnel the target date through
  `scheduleNextWater(idealDate, location, existing)` from
  `scheduling/bin-packer.ts` AND call
  `logScheduleEvents(db, plantId, result)` so `overflow_rebalance` /
  `schedule_congested` events fire consistently. Wired call sites:
  `routes/plants.ts` (water + PUT repot), `routes/calibration.ts`,
  `enrichment/callback.ts`, `scheduling/vacation.ts`. Single-water
  uses `waterPlant()` helper in `routes/plants.ts`; `POST /water-all`
  uses the same helper per plant. `POST /api/plants` bypasses this on
  initial insert by design — enrichment runs the rebalance seconds
  later.
- **Heating season:** affects watering frequency
  (`HEATING_SEASON_START` / `HEATING_SEASON_END`). The seasonal
  multiplier is applied in the water handler when
  `isInHeatingSeason()` is true; only `seasonal_adjustment` event is
  logged if interval differs. See
  `packages/api/src/scheduling/seasonal.ts`.
- **Growing season + dormancy** (#36):
  `GROWING_SEASON_START/END` (default Apr 1–Sep 30) +
  `GROWING_SEASON_MULTIPLIER` (default 0.8) +
  `DORMANCY_MULTIPLIER` (default 1.3) + `DRY_DAYS_BASE` (default 7).
  Stacks multiplicatively with the per-plant
  `heating_season_modifier`:
  `effective = round(current_interval × heatingMod × growOrDormancyMult)`.
  Only one `seasonal_adjustment` event per watering; its `reason`
  enumerates which layers fired. `current_interval` is the "dry-days
  target" (unchanged column, new semantic). See
  `packages/api/src/scheduling/seasonal.ts → applySeasonalMultipliers()`.
- **Undo-water state:** Each water event stores `old_value` as JSON
  (old `last_watered_at`, `next_water_date`, `calibration_cycle`).
  The `POST /:id/undo-water` route restores state from this snapshot.
- **Batch events & undo isolation:** `waterPlant()` passes `batchId`
  ONLY to `watered` + `seasonal_adjustment` events, never to
  `overflow_rebalance` / `schedule_congested`. This keeps
  `/undo-batch`'s `DELETE WHERE batch_id = ?` from destroying the
  rebalance audit trail.
- **`/api/calibration/due` joins questions.** The route enriches each
  due plant with its next calibration question
  (`calibration_questions[cycle % length]`) before returning, and
  filters out plants that have no questions seeded (those can't be
  calibrated yet — usually plants whose enrichment is `failed` from
  the legacy SDK era). The `CalibrationModal` component reads
  `plant.question.question_text` directly with no defense, so the
  server-side filter is what keeps the modal from crashing.
- **Archive soft-delete:** All scheduling queries must filter
  `WHERE archived = 0`. Species facts are soft-disabled when the last
  plant of a species is archived (checked in enrichment).
- **`createPlantsRouter()` signature** may accept an optional
  `heatingConfig` parameter (test fixtures can override season dates).

### Auth, sessions, recovery

- **Auth gate** (Wave 9 + 2026-04-26 hotfix): `requireAuth` middleware
  is **scoped to `/api/*`** (early-exits for any path that doesn't
  start with `/api/`). Inside `/api/*`, the bypass list is
  `/api/auth/*` and `/api/feedback`. `/health` is mounted before the
  middleware. Everything else under `/api/*` requires a valid session
  cookie when an admin password is set in `app_state`. Bootstrap mode
  (no `admin_password_hash` row yet) lets all `/api/*` traffic
  through; the operator claims the instance via `/welcome` using the
  setup token printed in server logs at first start.
  **Non-`/api/*` paths (the SPA shell, `/login`, `/welcome`, static
  bundle) always pass through** — the SPA's own AuthGate handles
  client-side route protection. The previous "fresh device gets 401
  at root" bug was caused by the middleware running globally; if you
  re-mount it without a path prefix you'll re-introduce the lockout.
- **Auth recovery:** `docker compose exec plant-api npm run reset-auth`
  prompts for a new password, replaces the hash, clears every session.
  Non-interactive: pass `-- --password '<pw>'`. From the host (when
  the container is down):
  `DATABASE_PATH=/path/to/plants.db npm --prefix packages/api run reset-auth`.
  CLI source at `packages/api/src/cli/reset-auth.ts`;
  `resetAuth(db, password)` is the pure function used by tests.
- **`/setup` route** is the **TRMNL device setup**, not auth. Auth
  bootstrap lives at **`/welcome`**. Don't conflate.

### Routing & URLs

- In `index.ts`, the scoped `/api` 404 handler must be registered
  AFTER all API routers but BEFORE the SPA catch-all
  (`app.get('{*path}', ...)`). Without it, GETs to unknown `/api/*`
  paths fall through to the SPA fallback and return `index.html` with
  status 200 — surfacing as cryptic `Unexpected token '<'` JSON parse
  errors in the client.
- **Cloudflare tunnel + `trust proxy`.** When deployed behind a
  reverse proxy, `app.set('trust proxy', 1)` is set in `index.ts` so
  `req.ip`, `req.secure`, and `req.protocol` honor `X-Forwarded-*`
  headers. Don't remove it — anything depending on real-client IP
  (rate limiting, audit logs) breaks without it. The session-cookie
  `secure` flag has its own `x-forwarded-proto` check so it works
  either way.

### Frontend

- **Top-level ErrorBoundary** (Wave 9) wraps the app — any uncaught
  render error shows a friendly fallback with a Reload button instead
  of unmounting the whole tree. The boundary lives at
  `packages/api/client/src/components/ErrorBoundary.tsx`. Don't
  remove it.
- **jsdom doesn't implement `scrollIntoView`.** Any component that
  calls `el.scrollIntoView(...)` on mount will crash every test in
  the file unless you stub it:

  ```ts
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });
  ```

  CalendarStrip Wave-12 tests do this — copy the pattern when adding
  scroll-on-mount to other components.
- **Test environments:** API vitest
  (`packages/api/vitest.config.ts`) runs in node env and excludes
  `client/**`. Client vitest
  (`packages/api/client/vitest.config.ts`) runs in jsdom with
  `@testing-library/react` + `jest-dom` matchers. Never run client
  `.test.tsx` files under the API runner — they'll crash with
  `ReferenceError: document is not defined`.

### Renderer & TRMNL

- The renderer container has no direct DB access — it only talks to
  the API.
- TRMNL fetches the screenshot on its own schedule; the renderer
  pre-renders and serves a static image.
- `CALIBRATION_DEADLINE_HOUR` controls the cutoff for same-day
  calibration (default: 12 = noon).

### Assets, images, Docker

- **Plant images** (Wave 9, #132): `plants.illustration_path`
  (existing column) holds a relative filename. When non-null, the
  SPA renders `/api/illustrations/:filename` from the
  `packages/api/assets/catalog-images/` static mount. Catalog entries
  can declare `image_path` which copies to the column on POST and on
  enrichment callback. Adding new catalog images = drop the file in
  `packages/api/assets/catalog-images/` + add `image_path` to the
  entry in `plants.json`. Pre-existing plant rows (added before the
  catalog had `image_path` for that species) need a one-shot DB
  backfill — they don't get the image automatically.
- **All API assets live under `packages/api/assets/`**
  (`catalog-images/`, `ornaments/`, `placeholder-plant.svg`,
  `seed-facts.json`). There used to be a *second* `assets/` at the
  project root that the compose file mounted onto `/app/assets`,
  which silently shadowed the in-image `catalog-images/` dir — this
  caused the monstera image to render as a broken icon for an entire
  wave. As of 2026-04-26 the root `./assets` is gone, the compose
  mount points at `./packages/api/assets`, and the Dockerfile copies
  the dir into the image so prod doesn't depend on the bind mount.
  **Don't re-introduce a root-level `assets/`.**
- **Docker build builds both the API and the client.** The
  `Dockerfile` in `packages/api/` runs `tsc` for the API stage and
  then `cd /app/client && npm ci && npm run build` for the SPA stage.
  The client is *not* an npm workspace, so its deps install
  standalone; Vite's `outDir: '../dist/client'` lands the build at
  `/app/dist/client` where the runtime container's static-file
  middleware looks for it. If you change the client's package set,
  the Docker image needs a rebuild
  (`docker compose build plant-api`).
- **`docker compose restart` does NOT pick up code changes.** It
  restarts the running container against the same image. After
  `docker compose build plant-api`, run
  `docker compose up -d plant-api` to recreate the container against
  the new image. `restart` is only for cycling a container that's
  already on the right image.

## Reference

- Roadmap: [`ROADMAP.md`](../ROADMAP.md)
- Current handoff: [`docs/HANDOFF.md`](HANDOFF.md)
- Release playbook: [`docs/RELEASE-PROCESS.md`](RELEASE-PROCESS.md)
- Master design spec: `docs/specs/2026-04-07-plnt-trmnl-design.md`
  (Wave 1, partly superseded by later wave docs — read the high-level
  architecture sections, skip the detailed feature specs)
- Historical wave plans: `docs/archive/`
