# Plant TRMNL — Session Handoff

Single-file briefing so a new session can pick up work without re-deriving context.
If anything here goes stale, fix it in the same PR that made it stale.

**Last updated:** 2026-04-25 (Wave 7 shipped)

---

## Where we are

- **Waves 1–7 are done.** Wave 6 shipped nav shell + PLNT branding + favicons + PWA manifest scaffold + vacation hidden (PR #112, closed #78–#81). Wave 7 removed the n8n dead path, retained the generic `POST /api/enrichment/callback` endpoint, and stabilised the `AddPlant.test.tsx:540` flake (PR #113, closed nothing — left scope-clarifying comments on #52, #56, #58).
- **Open PRs:** none.
- **Live instance:** runs on the Mac Mini under `npx tsx packages/api/src/index.ts` on port 3900. Restart procedure below.
- **Test baseline (post Wave 7):** API 490 / 490, renderer 43 / 43, client 110 / 110 (zero flake).

## Open issues at the start of Wave 8

| # | Title | Wave |
|---|---|---|
| #1 | Plant catalog: 250+ houseplant database | excluded by user (large data work, separate from feature waves) |
| #7 | TRMNL template: visual redesign to match Lovable mockups | Wave 10 |
| #18 | Auto-detect conditions from calibration patterns | Wave 10 |
| #40 | Frontend design pass: holistic UI refresh | Wave 9 |
| #52 | Remove n8n enrichment path entirely | pre-release wave (community API + INSTALL.md + Claude SDK optional) |
| #54 | Image generation pipeline for species illustrations | Wave 10 |
| #55 | TRMNL-X dual-resolution support | Wave 11 (may close as won't-do) |
| #56 | Copy enrichment prompt to clipboard (AI-agnostic UX) | pre-release wave (depends on #52) |
| #57 | Release process playbook + CHANGELOG | Wave 11 |
| #58 | [Maybe] Manual copy-paste enrichment fallback | pre-release wave (may close as WONTFIX) |
| #59 | PWA: installable home-screen app + offline | **Wave 8 — current** |
| #60 | Calibration UX: explanation, progress, convergence celebration | Wave 9 |

## What shipped in Wave 6 (PR #112)

| Issue | What it is |
|---|---|
| #78 | Rename app to PLNT throughout copy + page titles + manifest |
| #79 | 🪴 emoji as logo, favicon, and PWA icon — favicon SVG + 192/512 PNGs + apple-touch-icon, generated via `packages/api/client/scripts/generate-favicons.mjs` |
| #80 | Hamburger menu in top nav with focus trap, route-change close, body-scroll lock — `components/nav/Header.tsx`, `HamburgerMenu.tsx`, `MenuDrawer.tsx` |
| #81 | Move "Vacation" out of dashboard; UI hidden via removed `<VacationToggle />` (logic preserved for Wave 8+ Settings reintegration) |

PWA manifest currently has `display: "browser"` — Wave 8 flips it to `standalone` and registers a service worker.

## What shipped in Wave 7 (PR #113)

- Deleted n8n client: `packages/api/src/enrichment/{webhook,retry}.ts` + tests.
- Dropped `n8nWebhookUrl` / `n8nMaxRetries` from `config.ts` and `N8N_ENRICHMENT_*` from `.env.example`.
- **Retained** `enrichment/callback.ts` (generic agent-agnostic ingest endpoint) — used as test seam in `routes/lifecycle.test.ts`, reusable by future community agents. Stripped only the two n8n string labels inside it.
- Stabilised `AddPlant.test.tsx` `#72` describe block: extended four `findBy*` timeouts to 5000 ms (component's first poll fires after a real 1s `setTimeout`, racing the default 1000 ms RTL timeout under fork load).

## Architectural carry-forwards

- **Catalog is the single source of truth** for species care defaults. Three endpoints: `/search` (substring + token prefix), `/suggest` (fuzzy did-you-mean), `/entry` (full entry by slug or species). Loader validates all 30 entries at boot.
- **POST /api/plants composition order:** insert plant row → `applyCatalogBaseline()` (if catalog_slug) → `seedCatalogFacts()` (if catalog match). Soil-feel (#70) wins over catalog for initial `current_interval`. Enrichment runs async via Claude Agent SDK and refines further.
- **Enrichment ingest is a generic endpoint:** `POST /api/enrichment/callback` accepts the canonical payload from any source (Claude SDK runs in-process via `claude-enrich.ts`; future external agents can post to the endpoint).
- **Scheduling (#36):** `effective_interval = round(current_interval × heatingMod × growOrDormancyMult)`. Heating season + growing/dormancy stack multiplicatively. Only one `seasonal_adjustment` event per watering; its `reason` enumerates which layers fired.
- **Facts lifecycle:** seeded from catalog on create (dedup by species), soft-disabled on archive of last plant of species, re-enabled on add. Daily cron picks least-recently-shown.
- **Nav shell:** `components/nav/Header.tsx` composes logo + hamburger + drawer. Route-change close uses `useRef(initialPathname)` to avoid spurious mount-time `onClose`.
- **Settings page** is minimal (one toggle today). Wave 8+ plans to host the vacation toggle, PWA install hints, and developer-info toggle here.

## Where to go next

**Wave 8 — PWA install + offline read (option A):** flip `display` to `standalone`, generate maskable icon variants, register a service worker via `vite-plugin-pwa` for app-shell + GET caching. Mutations show clear "you're offline" UX instead of queueing — no IndexedDB, no Background Sync. Issue #59. Spec + plan to be written for this wave next.

**Wave 9 — Design + calibration UX:** `#40` holistic frontend pass + `#60` calibration explanation/progress/celebration.

**Wave 10 — Auto-detection + visuals:** `#18` condition auto-detect from calibration patterns + `#54` species image gen pipeline + `#7` TRMNL template visual redesign.

**Pre-release wave (before #57):** `#52` community enrichment API endpoints (`GET /api/plants?enrichment=pending`, `POST /api/plants/:id/enrichment`), `INSTALL.md`, docker-compose `./backups` relative path, Claude SDK optional via config flag, `#56` copy-prompt-to-clipboard button. `#58` may close as WONTFIX after community feedback.

**Wave 11 — Release polish:** `#57` release process playbook + CHANGELOG; revisit `#55` (TRMNL-X dual-res) — likely close as won't-do unless a TRMNL-X owner asks.

**Excluded from feature waves:** `#1` plant-catalog expansion to 250+ entries — large data work, run separately as a script + native-Dutch-speaker audit pass.

## Pickup recipe (cheap context warmup)

```bash
cd ~/Projects/plant-trmnl
git status && git log --oneline -10
```

Then read **in this order** (stop as soon as you have what you need):

1. `docs/HANDOFF.md` — this file.
2. `CLAUDE.md` — repo conventions + gotchas.
3. `docs/incidents/2026-04-23-vitest-resource-exhaustion.md` — only if touching vitest configs.
4. The issue you're about to work on (`gh issue view N`).
5. Most recent design+plan in `docs/plans/`.
6. **Skip** the original design spec / Wave 3 plan unless you're re-deriving architecture — they're 100K+ tokens and mostly historical.

The auto-memory `project_plant_trmnl.md` already carries the cross-session facts; don't duplicate them here.

## Daily-ops cheatsheet

```bash
# Restart the live API (picks up code changes on main)
pkill -f "tsx packages/api/src/index.ts"
cd ~/Projects/plant-trmnl && env -u CLAUDECODE nohup npx tsx packages/api/src/index.ts > /tmp/plant-api.log 2>&1 &

# Rebuild the client into packages/api/dist/client
cd ~/Projects/plant-trmnl/packages/api/client && npm run build

# Renderer (TRMNL push cron)
pkill -f "tsx packages/renderer/src/index.ts"
cd ~/Projects/plant-trmnl && env -u CLAUDECODE nohup npx tsx packages/renderer/src/index.ts > /tmp/plant-renderer.log 2>&1 &

# Run full test suite safely (fork cap is on main, freeze-safe)
cd ~/Projects/plant-trmnl && npm test
cd ~/Projects/plant-trmnl/packages/api/client && npm test   # jsdom tests run separately
```

## Don't-forget list

- **`CLAUDECODE` env var** must be unset when running the API inside a Claude Code session — Claude Agent SDK refuses to start otherwise.
- **Client lives at `packages/api/client/`**, not `packages/client/`. The API serves its own `dist/client`. Client is **not** an npm workspace — vite/sharp dependencies must resolve from inside `packages/api/client/`.
- **Never run bare `vitest`** on this Mac Mini. Use `npm test`. The fork cap is the only thing between you and an SSH-recovery freeze.
- **`addColumnIfMissing`** — every new column needs both the `CREATE TABLE` entry *and* a call at the bottom of `initializeSchema` so live DBs get migrated.
- **Routes with literal path segments before `/:id`** (e.g. `/archived`, `/water-all`) must be declared *before* the `:id` route or Express matches them as ids.
- **Pre-existing tsc errors** in `routes/catalog.test.ts:24` and `routes/plants.ts:687-688` — neither blocks vitest (esbuild path) but they fail `tsc --build`. Investigate before any wave that needs a clean `npm run build` in `packages/api`.
