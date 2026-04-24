# Plant TRMNL — Session Handoff

Single-file briefing so a new session can pick up work without re-deriving context.
If anything here goes stale, fix it in the same PR that made it stale.

**Last updated:** 2026-04-24 (Wave 5 shipped)

---

## Where we are

- **Waves 1–5 are done.** Wave 5 shipped 14 PRs (#98–#111) across 12 issues; #76 closed as superseded by #3's inline mismatch warning; #1b (catalog expansion to 250+ entries) deferred to Wave 7.
- **Live instance:** runs on the Mac Mini under `npx tsx packages/api/src/index.ts` (port 3900). Restart procedure below — needs to run after each wave to pick up schema migrations.
- **Open PRs:** none — Wave 5 fully merged.
- **Plan doc:** `docs/plans/2026-04-24-wave-5-plan.md` (tier matrix + dependency graph).
- **Issue #36 design doc:** `docs/plans/2026-04-24-issue-36-design.md` (dry-soil-aware calibration + seasonal multiplier interaction).

## What shipped in Wave 5

| Issue | PR | What it is | Key files |
|---|---|---|---|
| #1a | #100 | Catalog foundation: 30 curated entries, types, loader, search API | `packages/api/catalog/plants.json`, `packages/api/src/catalog/` |
| #70 | #99 | Soil-feel seeds calibration when last-watered is unknown | `packages/api/src/routes/plants.ts`, `AddPlant.tsx` |
| #71 | #98 | Light-level help tooltip on AddPlant | `AddPlant.tsx` |
| #77 | #101 | Image attachments on feedback submissions (multer + thumbs) | `routes/feedback.ts`, `FeedbackDetail.tsx`, `feedback_images` table |
| #36 | #102 | Dry-soil-aware calibration: growing-season / dormancy multipliers | `scheduling/seasonal.ts`, `config.ts`, `.env.example` |
| #39 | #103 | Did-you-mean fuzzy fallback when enrichment can't recognise the name | `routes/catalog.ts` `/suggest`, `AddPlant.tsx` |
| #37 | #104 | "About this plant" card on PlantDetail (catalog-sourced) | `PlantDetail.tsx` `AboutCard`, loader `findBySpecies` |
| #74 | #105 | Prominent species header + Settings page w/ dev-info toggle | `PlantDetail.tsx`, new `pages/Settings.tsx`, route in `App.tsx` |
| #3  | #106 | Rich care profiles: light_profile, placement_tips, 15 conditions | catalog schema + loader validation + new PlantDetail sections |
| #2  | #107 | Streamlined AddPlant: catalog dropdown + identifier + room picker | `AddPlant.tsx` rewrite, `identifier` column migration |
| #75 | #108 | Conditions picker with generic + species sections + free-text fallback | new `conditions/generic.ts`, `PlantDetail.tsx` |
| #4  | #109 | Seed 15 catalog facts per plant on creation; dedup on species | catalog `facts` array, `seedCatalogFacts` in `plants.ts` |
| #38 | #110 | Daily fact rotation: `shown_at` tracking + 6 AM cron + TRMNL hook | facts schema, renderer cron, `full-view.liquid` |
| #72 | #111 | Post-add enrichment splash: confirms species + care preview | `AddPlant.tsx` splash, `enrichment_status` polling |

## Architectural carry-forwards from Wave 5

- **Catalog is the single source of truth** for species care defaults. Three endpoints: `/search` (substring + token prefix), `/suggest` (fuzzy did-you-mean), `/entry` (full entry by slug or species). Loader validates all 30 entries at boot; throws loudly on any shape violation.
- **POST /api/plants composition order:** insert plant row → `applyCatalogBaseline()` (if catalog_slug) → `seedCatalogFacts()` (if catalog match). Soil-feel (#70) still wins over catalog for initial `current_interval`. Enrichment runs async and refines further.
- **Scheduling (#36):** `effective_interval = round(current_interval × heatingMod × growOrDormancyMult)`. Heating season and growing/dormancy layer stack **multiplicatively**. Only one `seasonal_adjustment` event per watering; its `reason` enumerates which layers fired.
- **Facts lifecycle:** seeded from catalog on create (dedup by species), soft-disabled on archive of last plant of species, re-enabled when a new plant of that species is added. Daily cron picks least-recently-shown; resets the cycle when exhausted.
- **Settings page scaffold** is minimal (one toggle) but the pattern is set: context/hook + localStorage persistence.

## Follow-ups surfaced during Wave 5

- **#1b catalog expansion** to 250+ entries — deferred to Wave 7. Plan: offline generation script + native-Dutch-speaker audit of `nl` names.
- **Wave 3/4 follow-ups still open** (all low-priority, not blocking): surface `useWeekSchedule` fetch errors, collapse vacation-end congestion bursts, parallelize `CalibrationSequence` fetch, type `getEventsForPlant`, bin-pack `POST /api/plants` initial schedule, drop AddPlant's 20 cm default.

## Where to go next

**Wave 6 — Deferrals + feedback-triage additions.** `#7` TRMNL visual redesign + `#18` auto-detect conditions + `#78–#81` nav/naming feedback. UX stabilized enough now that a visual pass makes sense.

**Wave 7 — Catalog expansion.** `#1b` to 250+ entries via script + manual review.

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
