# Plant TRMNL — Session Handoff

Single-file briefing so a new session can pick up work without re-deriving context.
If anything here goes stale, fix it in the same PR that made it stale.

**Last updated:** 2026-04-23 (Wave 4 follow-ups landed)

---

## Where we are

- **Waves 1–4 are done, including follow-ups.** Wave 4 shipped #87, #88, #90, #91, #92, #93, #94. Follow-up PRs on 2026-04-23 evening: #95 (pot_size_category on TRMNL screen), #96 (mother plant name), #97 (drop legacy plants.notes column).
- **Test counts (main):** 338 API + 43 renderer + 35 client = **416 total, all green.** (One fewer than pre-#97 because the stores-optional-notes test was removed with the column.)
- **Live instance:** runs on the Mac Mini under `npx tsx packages/api/src/index.ts` (port 3900). Restart procedure below.
- **Open PRs:** none — Wave 4 fully merged.

## What shipped in Wave 4

| Issue | What it is | Key files |
|---|---|---|
| #9  | E2E lifecycle test — 9 scenarios, no HTTP mocks / no LLM | `packages/api/src/routes/lifecycle.test.ts` |
| #16 | Stats card + calibration trend on `PlantDetail` | `packages/api/client/src/utils/stats.ts` |
| #32 | Timestamped notes log — new `plant_notes` table + CRUD | `packages/api/src/routes/plant-notes.ts`, `components/NotesLog.tsx` |
| #33 | Archived plants view at `/archived` + `GET /api/plants/archived` | `pages/ArchivedPlants.tsx` |
| #34 | One-line fix: condition-resolve URL alignment | `pages/PlantDetail.tsx:544` |
| #35 | Origin story: `origin_type`, `origin_source`, `mother_plant_id` | `schema.ts`, `plants.ts`, `AddPlant.tsx`, `PlantDetail.tsx` |
| + | vitest fork cap (`maxForks: 2`) after 2nd system freeze | all three `vitest.config.ts` |

## Follow-ups surfaced during Wave 4 (file-level)

**Resolved 2026-04-23 evening (PRs #95–#97):**
- ✅ **#16:** TRMNL screen payload now projects `pot_size_category` alongside `potSizeCm`. Renderer opt-in pending. E2E TODO resolved.
- ✅ **#32:** legacy `plants.notes` column dropped from schema (CREATE + live-DB migration via new `dropColumnIfExists` helper). Client `Plant.notes` removed.
- ✅ **#35:** `GET /api/plants/:id` now returns `mother_plant_name` via subquery join; UI shows "Seedling of Monstera" instead of `#3`.
- **#35 remaining:** no separate `acquired_at` date column — `created_at` covers the common case. Low-priority.

**Wave 3 follow-ups still open** (all low-priority, not blocking):
- surface `useWeekSchedule` fetch errors
- collapse vacation-end congestion bursts
- parallelize `CalibrationSequence` fetch
- type `getEventsForPlant`
- bin-pack `POST /api/plants` initial schedule
- drop AddPlant's 20 cm default

## Where to go next

**Wave 5 — Catalog + deep features.** Start with **#1 (Tier-1 catalog, ~50 plants + search endpoint)** — it blocks #2, #3, #4, #37, #39. Hard ordering constraint documented in `2026-04-22-wave-progress.md` Dependency section.

**Wave 6 — Deferred.** `#40` frontend design pass + `#7` TRMNL visual + `#18` auto-detect conditions + `#78–81` nav/naming feedback. Do these only after Wave 5 stabilizes UX copy/structure.

## Pickup recipe (cheap context warmup)

```bash
cd ~/Projects/plant-trmnl
git status && git log --oneline -10
```

Then read **in this order** (stop as soon as you have what you need):

1. `docs/HANDOFF.md` — this file.
2. `docs/plans/2026-04-22-wave-progress.md` — wave table + grooming notes.
3. `CLAUDE.md` — repo conventions + gotchas.
4. `docs/incidents/2026-04-23-vitest-resource-exhaustion.md` — only if touching vitest configs.
5. The issue you're about to work on (`gh issue view N`).
6. **Skip** the original design spec / Wave 3 plan unless you're re-deriving architecture — they're 100K+ tokens and mostly historical.

The auto-memory `project_plant_trmnl.md` already carries the cross-session facts; don't duplicate them here.

## Daily-ops cheatsheet

```bash
# Restart the live API (picks up code changes on main)
pkill -f "tsx packages/api/src/index.ts"
cd ~/Projects/plant-trmnl && env -u CLAUDECODE nohup npx tsx packages/api/src/index.ts > /tmp/plant-api.log 2>&1 &

# Rebuild the client into packages/api/dist/client
cd ~/Projects/plant-trmnl/packages/api/client && npm run build

# Run full test suite safely (fork cap is on main, freeze-safe)
cd ~/Projects/plant-trmnl && npm test
cd ~/Projects/plant-trmnl/packages/api/client && npm test   # jsdom tests run separately
```

## Don't-forget list

- **`CLAUDECODE` env var** must be unset when running the API inside a Claude Code session — Claude Agent SDK refuses to start otherwise.
- **Client lives at `packages/api/client/`**, not `packages/client/`. The API serves its own `dist/client`.
- **Never run bare `vitest`** on this Mac Mini. Use `npm test`. The fork cap is the only thing between you and an SSH-recovery freeze.
- **`addColumnIfMissing`** — every new column needs both the `CREATE TABLE` entry *and* a call at the bottom of `initializeSchema` so live DBs get migrated.
- **Routes with literal path segments before `/:id`** (e.g. `/archived`, `/water-all`) must be declared *before* the `:id` route or Express matches them as ids.
