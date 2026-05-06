# Plnt TRMNL — Session Handoff

Single-file briefing so a new session, contributor, or future-you can pick up work without re-deriving context. **If anything here goes stale, fix it in the same PR that made it stale.**

**Last updated:** 2026-05-06 (post repo-public flip, OSS-readiness batch, branch protection, Storybook on GH Pages, `PLNT` → `p7l` wordmark rebrand, dog-food triage + Wave 17 groomed in. v1.0.0 still not tagged; **Wave 17 — Dog-food polish + sunset** is the next functional wave, ahead of Wave 14.)

---

## Where we are

- **Waves 1–10 + 12 + 13 are shipped and merged to `main`.**
  - Wave 8 (PR #114, squash `fa8289d`) — pull-based architecture
  - Wave 9 — auth gate, ErrorBoundary, hamburger fix, monstera plant image, AI-connection heuristic
  - Wave 10 — empty-state polish, AddPlant tooltips, post-add splash refactor
  - Wave 12 — date strip distinct today/selected + 11-day centred scroll (#126); archive-flow nav fix + memorial page redesign (#135)
  - Wave 13 (this session) — plant detail structural rework: passport IA scaffolding (#134, foundation only), ConditionCard cards (#133), calibration UX (#60). Filed 5 child issues (#139–#143) for the deferred reorder / per-section redesigns.
- **Wave 11 (illustration pipeline) re-bundled into Wave 14** alongside the TRMNL template (#7). Design landed in [#138](https://github.com/tsipotU/plnt-trmnl/issues/138); generation source still needs to be chosen before that part can ship. The original [#54](https://github.com/tsipotU/plnt-trmnl/issues/54) was closed as superseded.
- **Catalog at 444 species** across 12 categories (expanded from 250 on 2026-04-26). Per-category counts: foliage 108, succulents 57, flowering 47, cacti 32, orchids 26, ferns/herbs/indoor_trees/palms/carnivorous/terrarium 25, air_plants 24. 6,660 unique species facts. Strict validator green at boot.
- **Architecture is pull-based:** zero in-process LLM. External AI tools poll `/api/plants?enrichment=pending` and `/api/conditions?care_update=pending`, then POST back. Connect-your-AI UI in Settings.
- **Auth gate live, scoped to `/api/*`** (fixed 2026-04-26 — see hotfix #2 below). Self-hosted instances require a setup token (printed in API logs at first start) → `/welcome` page to claim → `/login` for return visits. `/health`, `/api/auth/*`, and `/api/feedback` are public API routes; everything else under `/api/*` requires a session. **All non-`/api/*` paths (the SPA shell, `/login`, `/welcome`, static bundle) always pass through** — the SPA's own AuthGate component handles client-side route protection. Bootstrap mode (no admin password yet) lets all `/api/*` traffic through.
- **Cloudflare tunnel live.** Public URL: `https://plnt-trmnl.incal.one` → tunnel → `plant-api:3900`. `app.set('trust proxy', 1)` so `req.ip` / `req.secure` honor `X-Forwarded-*` headers.
- **Repo is public** (flipped 2026-05-05). Live at https://github.com/tsipotU/plnt-trmnl. v1.0.0 tag still pending — see "What's still pending for v1.0" below.
- **Storybook catalog live** at https://tsipotU.github.io/plnt-trmnl/. Auto-deploys on every push to `main` via `.github/workflows/storybook.yml`. 9 atoms · 26 molecules · 6 Foundations docs pages (Naming, Color, Accessibility, Theming, AddingAMolecule, plus Welcome).
- **Branch protection on `main`.** No direct pushes; every change goes via PR. Required status checks: `Client suite` + `API + renderer suite`. Squash-merge only. Auto-merge enabled at the repo level — `gh pr merge --auto --squash --delete-branch` armed PRs land as soon as checks pass.
- **Brand tokens.** Three: `plnt-trmnl` (codename / repo / package scopes), `p7l` (user-facing wordmark — Header, About, Welcome), `p7l-` (every CSS class). The previous `PLNT` wordmark is gone (PR #151, 2026-05-06). Naming.mdx Foundations doc codifies this.
- **Test baseline:** API **581** tests (added 3 from auth-recovery CLI), client **151** tests, renderer **43** tests. Wave 13 added 3 API + 11 client.

## What just happened (last 24h, in case you've been away)

00. **Wave 17 groomed in** (2026-05-06). Local instance was rebuilt to deploy the p7l rebrand → dog-food run produced 18 in-app feedback items → triaged into 17 new GitHub issues ([#155](https://github.com/tsipotU/plnt-trmnl/issues/155)–[#171](https://github.com/tsipotU/plnt-trmnl/issues/171)) plus 3 follow-ups ([#172](https://github.com/tsipotU/plnt-trmnl/issues/172)–[#174](https://github.com/tsipotU/plnt-trmnl/issues/174)) for older stale-open feedback. Highlights: [#166](https://github.com/tsipotU/plnt-trmnl/issues/166) sunsets vacation mode permanently; [#169](https://github.com/tsipotU/plnt-trmnl/issues/169) lands a Claude-Design-produced nav-surface design pass (6 new `--nav-*` tokens + Storybook expansion + component bindings) which fixes the transparency cluster; [#170](https://github.com/tsipotU/plnt-trmnl/issues/170) audits the 7 non-nav components silently broken by the same undefined `--bg-secondary` token. **Wave restructure**: inserted Wave 17 ahead of Wave 14, added Wave 18 (passport IA, post-v1.0). Order: 17 → 14 → 15 → 16 → 18, v1.0.0 tag at end of W16. **Milestones reorganised** on GitHub — wave-named milestones for 14/15/16/17/18 + v1.1/v2 backlog buckets, 5 stale `v0.x` milestones closed. **Issue housekeeping**: #1 closed (catalog at 444 exceeds 250+ goal), #148 retitled and scoped to category-only (vacation half obsoleted by #166). **Feedback DB updated** with link-comments mapping feedback rows to GitHub issues, and 3 stale-open rows flipped to `in_progress`. ROADMAP.md, CHANGELOG.md, this file all reflect the new state.
0. **Brand consolidation `PLNT` → `p7l`** (PR #151, 2026-05-06). Wordmark replaced everywhere it appears (Header, About, Dashboard welcome, TrmnlSetup, PlantDetail, README, INSTALL, conventions). Tokens are now `plnt-trmnl` (codename) / `p7l` (wordmark) / `p7l-` (CSS prefix). Naming.mdx Foundations table codifies it. Roadmap also gained two new backlog items: v1.1 iCalendar subscription feed, v2 propagation guides + calendar-backed propagation projects.
1. **Repo flipped public** (2026-05-05). History was rewritten via `git filter-repo --replace-text` to scrub leaked paths / IPs / private-project references before the flip; `scripts/pre-flip-audit.sh` was tightened to leakier patterns and exited 0 post-rewrite. Repo also renamed from `plant-trmnl` → `plnt-trmnl` (level B: visible surface only — DB filenames, localStorage keys, Docker service names preserved). License: kept MIT after critical review against AGPL / PolyForm; non-binding "Commercial use" community-norms section added to README via PR #150. Branch protection ruleset enabled.
2. **OSS-readiness batch** (rolling 2026-04-26 → 2026-05-05):
   - **Auth recovery CLI** — `npm run reset-auth` (`packages/api/src/cli/reset-auth.ts`). Idempotent, clears stored hash + every active session, supports `--password` / `--password-file` / `--database` / `--help`. INSTALL.md updated. 5 unit tests.
   - **Storybook GitHub Pages deploy** — `.github/workflows/storybook.yml` builds + deploys catalog on push to main.
   - **Foundations cookbook** — 5 MDX docs pages: Naming, Color, Accessibility, Theming, AddingAMolecule. `@storybook/addon-themes` for live light/dark toggle (`withThemeByDataAttribute`).
   - **`docs/conventions.md`** — agent-and-human conventions / gotchas reference, lifted from `CLAUDE.md` and reorganized by concern. `CLAUDE.md` slimmed to 27-line pointer.
   - **`docs/README.md`** — index for `docs/` (always-current vs wave-scoped vs append-only).
   - **README + CONTRIBUTING rewrite** — full rewrite per OSS-readiness outline.
   - **`@legacy` JSDoc on 14 page-local components** in `packages/api/client/src/components/`.
   - **#148 partial** — `StateFilter` trimmed to `'all' | 'due'` for v1.0; full filter rail (vacation + category) → v1.1.
3. **Catalog expansion 250 → 444 species** (commit `e96eb8d`, 2026-04-26). Per-category counts now: foliage 108, succulents 57, flowering 47, cacti 32, orchids 26, ferns/herbs/indoor_trees/palms/carnivorous/terrarium 25, air_plants 24. +194 entries, +2,910 unique facts (catalog total: 6,660). Generated by 13 parallel sub-agents (foliage split A+B); cross-batch validator confirmed zero slug/Latin/fact collisions before merge. 15 conditions × 5 is_common × 4 placement_tips per entry; loader strict-validates green at boot. WIP staging at `.wip-catalog-expand/` was cleaned up and gitignored on merge.
2. **Three hotfixes shipped to make multi-device + image rendering actually work** (commits `00894e5`, `92bc80f`, 2026-04-26):
   - **Image serving (`00894e5`):** monstera image rendered as broken-icon because `docker-compose.yml` mounted the legacy project-root `./assets` over `/app/assets`, shadowing the catalog-images. Fix: compose now mounts `./packages/api/assets`; Dockerfile copies `assets/` into the image so prod is self-contained without the bind mount; root `./assets/{ornaments,placeholder-plant.svg,seed-facts.json}` were `git mv`'d into `packages/api/assets/`. Also DB-backfilled `illustration_path` on the two existing Monstera plant rows that pre-dated Wave 9's catalog-copy-on-POST behavior.
   - **Auth gate (`92bc80f`):** the `requireAuth` middleware was applied at `app.use()` level (no path prefix), so it ran on every request — including the SPA shell, `/login`, `/welcome`. Fresh devices got `401 {"error":"Authentication required"}` at `/` and could never reach the login form. Fix: middleware early-exits for any path that doesn't start with `/api/`. The SPA's own AuthGate handles non-API route protection. **This was the real "phone can't log in" bug**, not anything cookie-related. Auth tests extended with three SPA-pass cases.
   - **`app.set('trust proxy', 1)`** for `req.ip`/`req.secure` correctness behind the Cloudflare tunnel.
3. **Wave 13 — Plant detail structural rework** shipped (earlier in same session). Three issues, one wave, ~10 commits:
   - `#134` Plant passport IA — `CollapsibleSection` primitive (`packages/api/client/src/components/CollapsibleSection.tsx`), image hero promoted to top of plant detail, History section wrapped as proof-of-concept. Full passport-order reorder deferred to child issue #139. Hero redesign #140, this-plant consolidation #141, sticky nav #142, origin & lore card #143.
   - `#133` ConditionCard primitive (`packages/api/client/src/components/ConditionCard.tsx`) replaces inline catalog conditions rendering. Identical-height collapsible cards, severity icons (⚠/ℹ), tag chips with min-width, optional `actionSlot` for the Flag-as-active button (sibling to toggle button — no nested-button HTML invalidity).
   - `#60` Calibration UX — `CalibrationExplanation` tooltip with first-visit pulse, "Calibration N of ~5" progress in modal title, calibration progress pill on plant detail Schedule, 🌿 dialed-in badge on PlantCard. New `convergence_event` field on calibration response (`'converged' | 'drifted' | null`); new event types `calibration_converged` and `calibration_drift_detected`.
   - **Roadmap reshuffle**: Wave 14 = TRMNL identity (#7 + #138, tomorrow), Wave 15 = PWA + TRMNL-X (#59 + #55), Wave 16 = pre-flip polish (#40) + release. Closed #18 (auto-detect from calibration patterns) as not-planned. #127 + #128 explicitly marked v2.
4. **Wave 12 — Polish & feedback** shipped (earlier session). Two issues, one wave:
   - `#126` Date strip — `?days=N` API param, hook now requests 11-day window centred on today, distinct visual treatments for today (filled green) vs selected (muted + outline), `scrollIntoView` on mount.
   - `#135` Archive flow — `setTimeout(navigate('/'), 3000)` replaced with immediate `navigate('/archive/:id', { replace: true })`. New `MemorialPlant` page at `/archive/:id` shows lifetime stats grid (waterings, offspring, calibration cycles, lifespan), cause line, past-tense location, small Restore action. New `GET /api/plants/:id/memorial` and `POST /api/plants/:id/restore` endpoints. PlantDetail redirects archived plants to memorial page.
5. **Dog-food triage round** (2026-04-25) — 17 in-app feedback items → 14 GitHub issues (#124–#137). All 17 in-app rows marked `done` with cross-link comments.
6. **Wave 9 — Hardening** shipped (commits `74b26e7` → `cc902cf`):
   - Top-level `ErrorBoundary` (no GH issue) — wraps `<App />`, friendly fallback + Reload button
   - `#124` Hamburger menu — iOS Safari tap-highlight + focus-visible scoping
   - `#131` Still-enriching banner — `/api/system/ai-connection` heuristic, hides stale "pending" UI when no AI tool active
   - `#132` Plant images (monstera-only) — `/api/illustrations/:filename` static endpoint, catalog `image_path` field, copy through to `plants.illustration_path` on POST
   - `#136` **Auth gate** — bcrypt + cookie sessions, `/welcome` setup, `/login`, `requireAuth` middleware, `scripts/reset-password.js`, INSTALL.md docs
7. **Wave 10 — Onboarding lite** shipped (commits `f0b0858` and 2 others):
   - `#125` Hide redundant Add button in empty state
   - `#129` AddPlant tooltips — 4-level light + new pot-size rule-of-thumb
   - `#130` Post-add splash — three-way fork (catalog hit / AI active / no-AI fallback)
8. **Wave 11 designed + deferred** (commit `b5a4b2b`):
   - Design captured in [#138](https://github.com/tsipotU/plnt-trmnl/issues/138) — two committed PNG variants per species (X 1872×1404 16-grey + OG 800×480 4-grey), convention-based catalog wiring, build-time dithering script using `sharp`
   - Generation source decision deferred (paid API vs self-hosted vs LLM-SVG vs hand-commissioned)
   - Style direction: line art / line art + shading
   - `#54` closed as superseded

## Live instance — dev runtime

The Mac mini runs two flavors of the stack:

- **Production-ish via Docker:** `docker compose up -d --build`. The live DB lives at `/data/plnt-trmnl.db` inside the `plnt-trmnl-plant-api-1` container (volume `db-data`). Feedback uploads at `/app/feedback-uploads/` inside the container.
- **Dev via tsx:** `nohup npx tsx watch packages/api/src/index.ts > /tmp/plant-api.log 2>&1 &`. Uses the host filesystem (`./plnt-trmnl.db`) — but as of 2026-04-26 we deleted that stale file because the Docker container has been the single source of truth.

```bash
# Restart Docker procedure
cd ~/Projects/plnt-trmnl
docker compose restart plant-api plant-renderer
docker compose logs -f --tail=30 plant-api
```

Verify: `curl http://localhost:3900/health` → `{"status":"ok","service":"plant-api"}`. SPA at `http://localhost:3900/`.

**To inspect live DB without freezing on WAL:** copy through the API (`curl /api/...`) or `docker exec plnt-trmnl-plant-api-1 sh -c "sqlite3 /data/plnt-trmnl.db ..."` — naive `docker cp` of the `.db` file alone gets a stale snapshot since SQLite buffers writes in `*.db-wal`.

**First-time auth bootstrap** (after a fresh Docker `up`): `docker compose logs plant-api | grep "setup token"` → visit `/`, get redirected to `/welcome`, paste token + choose password. Recovery: `docker compose exec plant-api node scripts/reset-password.js`.

## Open issues snapshot (as of HEAD)

33 open issues, all milestoned.

**Wave 17 — Dog-food polish + sunset (active, 18):** #155 (repot bug), #156 (foldout /add transparent), #157 (mobile tooltip z-index), #158 (zoom after feedback popup), #159 (tag-filter line glitch), #160 (notes don't save), #161 (Today button clipped), #162 (image lightbox), #164 (archive flow polish), #165 (feedback button restyle), #166 (sunset vacation mode), #167 (humanized water-state labels), #169 (nav surface design pass), #170 (`--bg-secondary` audit), #171 (v1.0.0 placeholder in About+Settings), #172 (pull-to-refresh stuck), #173 (plant images don't load), #174 (date-strip + plant-list disagree on empty state).

**Wave 14 — TRMNL identity:** #7 (TRMNL template visual), #138 (two-variant illustration pipeline, blocked on generator pick).

**Wave 15 — PWA + TRMNL-X:** #55 (dual-resolution renderer), #59 (PWA install + offline).

**Wave 16 — Holistic polish + v1.0.0 launch:** #40 (frontend design pass).

**Wave 18 — Plant detail passport IA (post-v1.0):** #139 (full section reorder), #140 (hero block redesign), #141 ("This plant" consolidation), #142 (sticky in-page nav), #143 (origin & lore card), #168 (common conditions cards collapse + uniform width).

**v1.1 backlog:** #144 (auth modernization), #148 (category filter — vacation half obsolete), #152 (iCalendar feed), #163 (task ribbon info+log panel).

**v2 backlog:** #127 (calendar grid view), #128 ("Identify my plant" walkthrough), #153 (propagation guides + projects).

Closed 2026-05-06: #1 (catalog at 444 species, exceeded 250+ goal). Closed 2026-04-26: #134, #133, #60, #18 (won't-fix), #126, #135. Closed earlier: #137 (goat-tracker GH bridge, not-planned), #54 (superseded by #138).

## Architectural carry-forwards

- **Catalog is the single source of truth** for species care defaults. 444 entries across 12 categories, strict-validated at boot. Three endpoints: `/api/catalog/search`, `/api/catalog/suggest`, `/api/catalog/entry`.
- **POST /api/plants composition order:** insert plant row → `applyCatalogBaseline()` → `seedCatalogFacts()` → catalog `image_path` copies to `plants.illustration_path` (if catalog match). Soil-feel (#70) wins over catalog for initial `current_interval`. Enrichment now waits for an external AI tool — the row sits at `enrichment_status = pending` until then.
- **Enrichment ingest:** `POST /api/enrichment/callback` and `POST /api/plants/:id/enrichment` both call `handleCallback()` in `enrichment/callback.ts`.
- **Auth gate** (Wave 9, #136): `requireAuth(db)` middleware applied after `cookieParser()` + auth router mount. `PUBLIC_PREFIXES = ['/health', '/api/auth/', '/api/feedback']`. Bootstrap mode (no `admin_password_hash` row in `app_state`) lets all traffic through. SPA `/welcome` and `/login` bypass `AuthGate`. Recovery: `scripts/reset-password.js`.
- **AI-connection heuristic** (Wave 9, #131): `GET /api/system/ai-connection` returns `{connected: bool}` based on `enrichment_complete` events in the last 7 days. SPA hook `useAiConnection` consumes this; PlantCard hides "pending" badge and PlantDetail swaps banner for "Connect AI" CTA when no recent activity.
- **Plant image plumbing** (Wave 9, #132): `plants.illustration_path` (existing column) holds a relative filename. `/api/illustrations/:filename` serves from `packages/api/assets/catalog-images/`. PlantDetail and EnrichmentSplash render `<img>` when set, fall back to 🪴 emoji.
- **Post-add splash flow** (Wave 10, #130): three-way fork after POST `/api/plants` — catalog hit (species + illustration_path on response) → success immediately; catalog miss + AI connected → 'enriching' poll (10s ceiling); catalog miss + no AI → 'no-match' fallback.
- **Memorial page** (Wave 12, #135): `GET /api/plants/:id/memorial` returns plant + computed lifetime stats (waterings = `event_log` count, offspring = `mother_plant_id` count, calibration cycles = `plants.calibration_cycle`, lifespan = `archived_at - created_at` in days). `POST /api/plants/:id/restore` un-archives, re-enables species facts that were soft-disabled at archive time, logs a `restored` event. SPA route `/archive/:id` → `MemorialPlant.tsx`. PlantDetail has a `Navigate` guard that bounces archived plants to the memorial page.
- **Date strip** (Wave 12, #126): `/api/schedule/week` accepts optional `?days=N` (default 7, range 1–30, back-compat). Dashboard hook now requests `from=today-5&days=11` so the strip spans ±5 days centred on today. `CalendarStrip.tsx` distinguishes today (filled green, white text) from selected (muted fill + outline) and scrolls the today tile into the centre on mount via `scrollIntoView({ inline: 'center' })`.
- **CollapsibleSection primitive** (Wave 13, #134): `packages/api/client/src/components/CollapsibleSection.tsx`. Accepts `title`, `children`, optional `defaultCollapsed`, optional `headerSlot`. Each section gets a button-toggle header with `aria-expanded`, rotating ▶ glyph indicator. Use this for any new collapsible section on plant detail; the deferred passport-order reorder (#139) will wrap the rest of the existing sections.
- **ConditionCard primitive** (Wave 13, #133): `packages/api/client/src/components/ConditionCard.tsx`. Card-level collapse for a single condition (severity icon + name + tags + optional `actionSlot` on the right, expandable to Symptoms/Remedy/Prevention). Used in PlantDetail's "Common conditions" section — the section-level "show 5 / show all 15" toggle is intact; only per-condition rendering changed. The `actionSlot` prop sits as a sibling div next to the toggle button (not nested) to avoid invalid nested-button HTML.
- **Calibration convergence transitions** (Wave 13, #60): `POST /api/plants/:id/calibration` now returns `convergence_event: 'converged' | 'drifted' | null` reflecting the `is_converged` 0→1 / 1→0 transition. New event types `calibration_converged` and `calibration_drift_detected` are emitted on transitions. SPA surfaces: `CalibrationModal` shows transition message in result card; `CalibrationSequence` flashes a banner above the next question; `PlantCard` and `PlantDetail` show a 🌿 dialed-in badge/chip when `is_converged === 1`. The underlying `checkConvergence` algorithm (three consecutive 3s) is unchanged — the wave just surfaces existing transitions.
- **ErrorBoundary** (Wave 9): `packages/api/client/src/components/ErrorBoundary.tsx` wraps `<App />`. Don't remove.
- **Scheduling (#36):** `effective_interval = round(current_interval × heatingMod × growOrDormancyMult)`.
- **Facts lifecycle:** seeded from catalog on create (dedup by species), soft-disabled on archive of last plant of species, re-enabled on add. Daily cron picks least-recently-shown.
- **Nav shell:** `components/nav/Header.tsx` composes logo + hamburger + drawer. Drawer now has a Log out button at the bottom.

## Pickup recipe (cheap context warmup)

```bash
cd ~/Projects/plnt-trmnl
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

- **Live DB lives in the Docker volume** (`/data/plnt-trmnl.db` inside `plnt-trmnl-plant-api-1`). The host file `~/Projects/plnt-trmnl/plnt-trmnl.db` was deleted on 2026-04-26 — no stale snapshot to confuse.
- **Always launch dev API from project root** (if running `tsx`), not from `packages/api/`. The catalog seeder reads `assets/ornaments` relative to CWD.
- **Client lives at `packages/api/client/`**, not `packages/client/`. The API serves its own `dist/client`. Client is **not** an npm workspace — vite/sharp dependencies must resolve from inside `packages/api/client/`.
- **Never run bare `vitest`** on this Mac mini. Use `npm test`. The `maxForks: 2` cap is the only thing between you and an SSH-recovery freeze.
- **`addColumnIfMissing`** — every new column needs both the `CREATE TABLE` entry *and* a call at the bottom of `initializeSchema`.
- **Routes with literal path segments before `/:id`** (e.g. `/archived`, `/water-all`) must be declared *before* the `:id` route.
- **Auth allowlist** — `/api/feedback` is currently in `PUBLIC_PREFIXES` as a stop-gap (the in-app feedback form was unauthenticated by design during dog-food). Revisit before public flip.
- **`/setup` route is the TRMNL device setup**, not auth. Auth bootstrap lives at `/welcome`. Don't conflate.
- **Tooltip aria-label collisions** — when adding a tooltip next to a form label, give the tooltip an `aria-label` that does NOT match the field name (e.g., "estimate pot diameter" instead of "Pot size help"). Otherwise `getByLabelText(/Pot size/i)` matches both and tests fail.

## What's still pending for v1.0

The OSS-readiness scaffolding has all landed — `LICENSE` (MIT), `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CODEOWNERS`, issue + PR templates, `.github/workflows/test.yml`, `.github/dependabot.yml`, `.nvmrc`, `.editorconfig`. History scrubbed; repo public; Storybook deployed; branch protection on. License framing clear.

What still gates v1.0.0:
- **Wave 17** — Dog-food polish + sunset (18 issues, see milestone). Burns down the 2026-05-06 dog-food output, lands the nav-surface design pass (#169), audits the `--bg-secondary` token (#170), sunsets vacation mode (#166). Inserted ahead of W14 because the polish + design-system gap close block clean v1.0 work.
- **Wave 14** — TRMNL identity (#7 template + #138 illustration pipeline, generation source still TBD).
- **Wave 15** — PWA (#59) + TRMNL-X dual-resolution (#55).
- **Wave 16** — holistic frontend design pass (#40), Native Dutch-name audit on the 444-plant catalog (Emiel), README screenshot/copy refresh, `INSTALL.md` clean-machine smoke test.
- **Tag v1.0.0**, draft GitHub Release notes from CHANGELOG `[Unreleased]`, announce (TRMNL Discord, /r/houseplants, /r/selfhosted, HN).

Wave 18 (passport IA — #139–#143 + #168) is post-v1.0; doesn't gate the tag.

`docs/RELEASE-PROCESS.md` documents the mechanics in detail. `ROADMAP.md` carries the wave-by-wave plan; v1.1 and v2 backlog also live there (calendar feed, propagation, auth modernization, illustrations rollout, drift-from-mean calibration, identify walkthrough, calendar view, multi-user).
