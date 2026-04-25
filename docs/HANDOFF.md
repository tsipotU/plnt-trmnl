# Plant TRMNL — Session Handoff

Single-file briefing so a new session, contributor, or future-you can pick up work without re-deriving context. **If anything here goes stale, fix it in the same PR that made it stale.**

**Last updated:** 2026-04-26 (post Waves 9 + 10 ship; Wave 11 deferred to #138)

---

## Where we are

- **Waves 1–10 are shipped and merged to `main`.**
  - Wave 8 (PR #114, squash `fa8289d`) — pull-based architecture
  - Wave 9 (this session) — auth gate, ErrorBoundary, hamburger fix, monstera plant image, AI-connection heuristic
  - Wave 10 (this session) — empty-state polish, AddPlant tooltips, post-add splash refactor
- **Wave 11 deferred.** Design landed in [#138](https://github.com/tsipotU/plant-trmnl/issues/138); held until generation source is chosen. The original [#54](https://github.com/tsipotU/plant-trmnl/issues/54) was closed as superseded.
- **Catalog at 250 species** across 12 categories. Strict validator green at boot.
- **Architecture is pull-based:** zero in-process LLM. External AI tools poll `/api/plants?enrichment=pending` and `/api/conditions?care_update=pending`, then POST back. Connect-your-AI UI in Settings.
- **Auth gate live.** Self-hosted instances now require a setup token (printed in API logs at first start) → `/welcome` page to claim → `/login` for return visits. `/health`, `/api/auth/*`, and `/api/feedback` are public; everything else requires session. Bootstrap mode (no admin password yet) lets all traffic through.
- **Repo is still private.** Public flip + v1.0.0 tag scheduled for Wave 14.
- **Test baseline:** API **563** tests, client **130** tests (was 515 + 118 before this session).

## What just happened (last 24h, in case you've been away)

1. **Dog-food triage round** (2026-04-25) — 17 in-app feedback items → 14 GitHub issues (#124–#137). All 17 in-app rows marked `done` with cross-link comments.
2. **Wave 9 — Hardening** shipped (commits `74b26e7` → `cc902cf`):
   - Top-level `ErrorBoundary` (no GH issue) — wraps `<App />`, friendly fallback + Reload button
   - `#124` Hamburger menu — iOS Safari tap-highlight + focus-visible scoping
   - `#131` Still-enriching banner — `/api/system/ai-connection` heuristic, hides stale "pending" UI when no AI tool active
   - `#132` Plant images (monstera-only) — `/api/illustrations/:filename` static endpoint, catalog `image_path` field, copy through to `plants.illustration_path` on POST
   - `#136` **Auth gate** — bcrypt + cookie sessions, `/welcome` setup, `/login`, `requireAuth` middleware, `scripts/reset-password.js`, INSTALL.md docs
3. **Wave 10 — Onboarding lite** shipped (commits `f0b0858` and 2 others):
   - `#125` Hide redundant Add button in empty state
   - `#129` AddPlant tooltips — 4-level light + new pot-size rule-of-thumb
   - `#130` Post-add splash — three-way fork (catalog hit / AI active / no-AI fallback)
4. **Wave 11 designed + deferred** (commit `b5a4b2b`):
   - Design captured in [#138](https://github.com/tsipotU/plant-trmnl/issues/138) — two committed PNG variants per species (X 1872×1404 16-grey + OG 800×480 4-grey), convention-based catalog wiring, build-time dithering script using `sharp`
   - Generation source decision deferred (paid API vs self-hosted vs LLM-SVG vs hand-commissioned)
   - Style direction: line art / line art + shading
   - `#54` closed as superseded

## Live instance — dev runtime

The Mac mini runs two flavors of the stack:

- **Production-ish via Docker:** `docker compose up -d --build`. The live DB lives at `/data/plant-trmnl.db` inside the `plant-trmnl-plant-api-1` container (volume `db-data`). Feedback uploads at `/app/feedback-uploads/` inside the container.
- **Dev via tsx:** `nohup npx tsx watch packages/api/src/index.ts > /tmp/plant-api.log 2>&1 &`. Uses the host filesystem (`./plant-trmnl.db`) — but as of 2026-04-26 we deleted that stale file because the Docker container has been the single source of truth.

```bash
# Restart Docker procedure
cd ~/Projects/plant-trmnl
docker compose restart plant-api plant-renderer
docker compose logs -f --tail=30 plant-api
```

Verify: `curl http://localhost:3900/health` → `{"status":"ok","service":"plant-api"}`. SPA at `http://localhost:3900/`.

**To inspect live DB without freezing on WAL:** copy through the API (`curl /api/...`) or `docker exec plant-trmnl-plant-api-1 sh -c "sqlite3 /data/plant-trmnl.db ..."` — naive `docker cp` of the `.db` file alone gets a stale snapshot since SQLite buffers writes in `*.db-wal`.

**First-time auth bootstrap** (after a fresh Docker `up`): `docker compose logs plant-api | grep "setup token"` → visit `/`, get redirected to `/welcome`, paste token + choose password. Recovery: `docker compose exec plant-api node scripts/reset-password.js`.

## Open issues snapshot (as of HEAD)

| # | Title | Wave |
|---|---|---|
| #1 | Plant catalog: 250+ houseplant database | shipped (250 entries; native-Dutch audit pending → Wave 14) |
| #7 | TRMNL template: visual redesign to match Lovable mockups | Wave 13 |
| #18 | Auto-detect conditions from calibration patterns | Wave 12 |
| #40 | Frontend design pass: holistic UI refresh | Wave 13 |
| #55 | TRMNL-X dual-resolution renderer support | Wave 11 (re-evaluate when generator picked) |
| #59 | PWA: installable home-screen app + offline | Wave 12 |
| #60 | Calibration UX: explanation, progress, convergence celebration | Wave 13 |
| #126 | Date strip: distinguish selected + ±5-day scroll | Wave 12 |
| #127 | Calendar view (week/month/year) | Wave 15+ (post-v1.0) |
| #128 | "Identify my plant" walkthrough | Wave 15+ (post-v1.0) |
| #133 | Common conditions UI redesign | Wave 12 / 13 |
| #134 | **Epic:** Plant passport IA | Wave 13 (design-doc front-half) |
| #135 | Memorial / archive page redesign | Wave 12 / 13 |
| #138 | **Wave 11 (deferred):** two-variant illustration pipeline | Wave 11+ (deferred) |

(`#137` GH-bridge port from goat-tracker was closed as not-planned — manual triage works for now.)

## Architectural carry-forwards

- **Catalog is the single source of truth** for species care defaults. 250 entries across 12 categories, strict-validated at boot. Three endpoints: `/api/catalog/search`, `/api/catalog/suggest`, `/api/catalog/entry`.
- **POST /api/plants composition order:** insert plant row → `applyCatalogBaseline()` → `seedCatalogFacts()` → catalog `image_path` copies to `plants.illustration_path` (if catalog match). Soil-feel (#70) wins over catalog for initial `current_interval`. Enrichment now waits for an external AI tool — the row sits at `enrichment_status = pending` until then.
- **Enrichment ingest:** `POST /api/enrichment/callback` and `POST /api/plants/:id/enrichment` both call `handleCallback()` in `enrichment/callback.ts`.
- **Auth gate** (Wave 9, #136): `requireAuth(db)` middleware applied after `cookieParser()` + auth router mount. `PUBLIC_PREFIXES = ['/health', '/api/auth/', '/api/feedback']`. Bootstrap mode (no `admin_password_hash` row in `app_state`) lets all traffic through. SPA `/welcome` and `/login` bypass `AuthGate`. Recovery: `scripts/reset-password.js`.
- **AI-connection heuristic** (Wave 9, #131): `GET /api/system/ai-connection` returns `{connected: bool}` based on `enrichment_complete` events in the last 7 days. SPA hook `useAiConnection` consumes this; PlantCard hides "pending" badge and PlantDetail swaps banner for "Connect AI" CTA when no recent activity.
- **Plant image plumbing** (Wave 9, #132): `plants.illustration_path` (existing column) holds a relative filename. `/api/illustrations/:filename` serves from `packages/api/assets/catalog-images/`. PlantDetail and EnrichmentSplash render `<img>` when set, fall back to 🪴 emoji.
- **Post-add splash flow** (Wave 10, #130): three-way fork after POST `/api/plants` — catalog hit (species + illustration_path on response) → success immediately; catalog miss + AI connected → 'enriching' poll (10s ceiling); catalog miss + no AI → 'no-match' fallback.
- **ErrorBoundary** (Wave 9): `packages/api/client/src/components/ErrorBoundary.tsx` wraps `<App />`. Don't remove.
- **Scheduling (#36):** `effective_interval = round(current_interval × heatingMod × growOrDormancyMult)`.
- **Facts lifecycle:** seeded from catalog on create (dedup by species), soft-disabled on archive of last plant of species, re-enabled on add. Daily cron picks least-recently-shown.
- **Nav shell:** `components/nav/Header.tsx` composes logo + hamburger + drawer. Drawer now has a Log out button at the bottom.

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
6. The wave's design + plan if it exists in `docs/plans/`. Wave 9 plan at `docs/plans/2026-04-25-wave-9-plan.md`, Wave 10 at `docs/plans/2026-04-25-wave-10-plan.md`. Historical (Waves 1–8) live in `docs/archive/`.

The auto-memory `project_plant_trmnl.md` already carries cross-session facts; don't duplicate them here.

## Don't-forget list

- **Live DB lives in the Docker volume** (`/data/plant-trmnl.db` inside `plant-trmnl-plant-api-1`). The host file `~/Projects/plant-trmnl/plant-trmnl.db` was deleted on 2026-04-26 — no stale snapshot to confuse.
- **Always launch dev API from project root** (if running `tsx`), not from `packages/api/`. The catalog seeder reads `assets/ornaments` relative to CWD.
- **Client lives at `packages/api/client/`**, not `packages/client/`. The API serves its own `dist/client`. Client is **not** an npm workspace — vite/sharp dependencies must resolve from inside `packages/api/client/`.
- **Never run bare `vitest`** on this Mac mini. Use `npm test`. The `maxForks: 2` cap is the only thing between you and an SSH-recovery freeze.
- **`addColumnIfMissing`** — every new column needs both the `CREATE TABLE` entry *and* a call at the bottom of `initializeSchema`.
- **Routes with literal path segments before `/:id`** (e.g. `/archived`, `/water-all`) must be declared *before* the `:id` route.
- **Auth allowlist** — `/api/feedback` is currently in `PUBLIC_PREFIXES` as a stop-gap (the in-app feedback form was unauthenticated by design during dog-food). Revisit before public flip.
- **`/setup` route is the TRMNL device setup**, not auth. Auth bootstrap lives at `/welcome`. Don't conflate.
- **Tooltip aria-label collisions** — when adding a tooltip next to a form label, give the tooltip an `aria-label` that does NOT match the field name (e.g., "estimate pot diameter" instead of "Pot size help"). Otherwise `getByLabelText(/Pot size/i)` matches both and tests fail.

## Community-release scaffolding

Landed during the post-Wave-8 cleanup pass — review at flip time but don't expect to write them from scratch:

- `LICENSE` (MIT), `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CODEOWNERS`.
- `.github/ISSUE_TEMPLATE/{bug,feature}.md`, `.github/pull_request_template.md`.
- `.github/workflows/test.yml`, `.github/dependabot.yml`.
- `.nvmrc`, `.editorconfig`.

What's still pending for Wave 14:
- Native Dutch-name audit on the 250-plant catalog (Emiel).
- Run `scripts/pre-flip-audit.sh` + `git filter-repo` on history.
- README screenshot pass + `INSTALL.md` smoke test on a clean machine.
- Tag v1.0.0 + announce.

`docs/RELEASE-PROCESS.md` documents the mechanics in detail.
