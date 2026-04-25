# Plant TRMNL — Session Handoff

Single-file briefing so a new session, contributor, or future-you can pick up work without re-deriving context. **If anything here goes stale, fix it in the same PR that made it stale.**

**Last updated:** 2026-04-25 (post Wave 8 + 250-plant catalog + calibration crash fix; dog-food window starting)

---

## Where we are

- **Waves 1–8 are shipped and merged to `main`.** PR #114 closed; commit `004e7ea` is the current HEAD.
- **Catalog at 250 species across 12 categories** (see `CHANGELOG.md` `[Unreleased]`). Strict validator green at boot.
- **Architecture is pull-based:** zero in-process LLM. External AI tools poll `/api/plants?enrichment=pending` and `/api/conditions?care_update=pending`, then POST back. Connect-your-AI UI lives in Settings.
- **Repo is still private.** Public flip + v1.0.0 tag are scheduled for Wave 14 after the dog-food window.
- **Forward-looking work:** see [`ROADMAP.md`](../ROADMAP.md) — Waves 9–14 are placeholders to brainstorm later.
- **Test baseline:** API 515 / 515, client 118 / 118, catalog tests 44 / 44.

## What just happened (last 24h, in case you've been away)

1. **Wave 8 merged** (PR #114, squash `fa8289d`): SDK removed, pull-based API live, INSTALL.md + CHANGELOG + RELEASE-PROCESS shipped, pre-flip scripts codified.
2. **Catalog grew 30 → 75 → 250.** Generated via 4 rounds of parallel Haiku-4.5 agent dispatches (24 generators + 4 fix agents). Schema enums extended with `orchids`, `carnivorous`, `herbs`, `terrarium`. Phalaenopsis migrated from `flowering` → `orchids`.
3. **Calibration crash fix** (commit `004e7ea`): `/api/calibration/due` now joins each due plant with its next question; the `CalibrationModal` was reading `plant.question.question_text` with no defense and the whole React tree was unmounting. Triggered when Rayne's `next_water_date` rolled to today and she had no calibration questions seeded (her `enrichment_status = failed` from the pre-Wave-8 era).

## Live instance — dev runtime

The Mac mini runs `tsx watch` from project root, both backgrounded with `nohup`. Database state is on disk (`./plant-trmnl.db`); restarts don't lose data.

```bash
# Restart procedure (the one that worked)
cd ~/Projects/plant-trmnl
pkill -f "tsx.*packages/api/src/index"
pkill -f "tsx.*packages/renderer/src/index"

# IMPORTANT: launch from project root, not from packages/api/ — the API
# resolves `assets/ornaments` relative to CWD.
nohup npx tsx watch packages/api/src/index.ts      > /tmp/plant-api.log      2>&1 &
nohup npx tsx watch packages/renderer/src/index.ts > /tmp/plant-renderer.log 2>&1 &
disown
```

Verify: `curl http://localhost:3900/health` → `{"status":"ok","service":"plant-api"}`. The SPA is at `http://localhost:3900/`.

These dev processes survive terminal close but **not reboot**. The durable path is `docker compose up -d --build` (see `docker-compose.yml`).

## Open issues snapshot (as of HEAD)

| # | Title | Wave |
|---|---|---|
| #1 | Plant catalog: 250+ houseplant database | **shipped** (250 entries; native-Dutch audit pending → Wave 14) |
| #7 | TRMNL template: visual redesign to match Lovable mockups | Wave 13 |
| #18 | Auto-detect conditions from calibration patterns | Wave 12 / Wave 13 |
| #40 | Frontend design pass: holistic UI refresh | Wave 13 |
| #54 | Image generation pipeline for species illustrations | **Wave 11** |
| #55 | TRMNL-X dual-resolution support | Wave 11 (re-evaluate) |
| #59 | PWA: installable home-screen app + offline | Wave 12 / 13 (deferred from Wave 8 scope) |
| #60 | Calibration UX: explanation, progress, convergence celebration | Wave 13 |

## Architectural carry-forwards

- **Catalog is the single source of truth** for species care defaults. 250 entries across 12 categories, strict-validated at boot. Three endpoints: `/api/catalog/search` (substring + token prefix), `/api/catalog/suggest` (fuzzy did-you-mean), `/api/catalog/entry` (full entry by slug or species).
- **POST /api/plants composition order:** insert plant row → `applyCatalogBaseline()` (if `catalog_slug`) → `seedCatalogFacts()` (if catalog match). Soil-feel (#70) wins over catalog for initial `current_interval`. Enrichment now waits for an external AI tool — the row sits at `enrichment_status = pending` until then.
- **Enrichment ingest is a generic endpoint:** `POST /api/enrichment/callback` and `POST /api/plants/:id/enrichment` both call `handleCallback(db, plantId, body, res)` in `packages/api/src/enrichment/callback.ts`.
- **Scheduling (#36):** `effective_interval = round(current_interval × heatingMod × growOrDormancyMult)`. Heating season + growing/dormancy stack multiplicatively. Only one `seasonal_adjustment` event per watering; its `reason` enumerates which layers fired.
- **Facts lifecycle:** seeded from catalog on create (dedup by species), soft-disabled on archive of last plant of species, re-enabled on add. Daily cron picks least-recently-shown.
- **Nav shell:** `components/nav/Header.tsx` composes logo + hamburger + drawer. Route-change close uses `useRef(initialPathname)` to avoid spurious mount-time `onClose`.
- **Calibration crash class** (post-fix learning): the SPA has no top-level ErrorBoundary. Any uncaught render error blanks the whole app. Treat client type contracts as load-bearing until Wave 9 (hardening) adds defense in depth.

## Pickup recipe (cheap context warmup)

```bash
cd ~/Projects/plant-trmnl
git status && git log --oneline -10
```

Then read **in this order** (stop as soon as you have what you need):

1. `docs/HANDOFF.md` — this file.
2. `ROADMAP.md` — what's next, big picture.
3. `CLAUDE.md` — repo conventions + current gotchas.
4. `CHANGELOG.md` — what shipped recently.
5. The issue you're about to work on (`gh issue view N`).
6. The wave's design + plan if it exists in `docs/plans/`. (Historical waves are in `docs/archive/`; usually you don't need them.)

The auto-memory `project_plant_trmnl.md` already carries cross-session facts; don't duplicate them here.

## Don't-forget list

- **Always launch dev API from project root**, not from `packages/api/`. The catalog seeder reads `assets/ornaments` relative to CWD. (See "Live instance" above.)
- **Client lives at `packages/api/client/`**, not `packages/client/`. The API serves its own `dist/client`. Client is **not** an npm workspace — vite/sharp dependencies must resolve from inside `packages/api/client/`.
- **Never run bare `vitest`** on this Mac mini. Use `npm test`. The `maxForks: 2` cap is the only thing between you and an SSH-recovery freeze.
- **`addColumnIfMissing`** — every new column needs both the `CREATE TABLE` entry *and* a call at the bottom of `initializeSchema` so live DBs get migrated.
- **Routes with literal path segments before `/:id`** (e.g. `/archived`, `/water-all`) must be declared *before* the `:id` route or Express matches them as ids.
- **Pre-existing tsc errors** in `routes/catalog.test.ts:24` and `routes/plants.ts:687-688` — neither blocks vitest (esbuild path) but they fail `tsc --build`. Investigate before any wave that needs a clean `npm run build` in `packages/api`.
- **Treat client type contracts as load-bearing.** No ErrorBoundary; any shape drift blanks the app. Wave 9 will fix this.

## Community-release scaffolding

Landed during the post-Wave-8 cleanup pass — review at flip time but don't expect to write them from scratch:

- `LICENSE` (MIT, matching the README's claim).
- `SECURITY.md` — disclosure policy + scope (LAN-only deployment is by design, not a vuln).
- `CONTRIBUTING.md` — dev setup, test commands, wave cadence, commit/PR conventions.
- `CODE_OF_CONDUCT.md` — points at Contributor Covenant 2.1.
- `CODEOWNERS` — maintainer auto-assign.
- `.github/ISSUE_TEMPLATE/{bug,feature}.md` and `.github/pull_request_template.md`.
- `.github/workflows/test.yml` — CI runs API + renderer + client suites on push/PR.
- `.github/dependabot.yml` — weekly npm + monthly GitHub Actions / Docker.
- `.nvmrc` — pins Node 24 (matches the live runtime; CI reads it via `node-version-file`).
- `.editorconfig` — 2-space LF UTF-8.

What's still pending for Wave 14:
- Native Dutch-name audit on the 250-plant catalog (Emiel).
- Run `scripts/pre-flip-audit.sh` + `git filter-repo` on history.
- README screenshot pass + `INSTALL.md` smoke test on a clean machine.
- Tag v1.0.0 + announce.

`docs/RELEASE-PROCESS.md` documents the mechanics in detail.
