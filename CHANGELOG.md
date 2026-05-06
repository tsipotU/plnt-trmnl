# Changelog

All notable changes to plnt-trmnl are documented here.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Hotfixes — auth gate + image serving + Cloudflare hygiene (2026-04-26)

- **Auth gate scoped to `/api/*`.** The `requireAuth` middleware was applied at `app.use()` level with no path prefix, so it ran on every request — including the SPA shell, `/login`, and `/welcome`. Fresh devices with no session cookie hit `401 {"error":"Authentication required"}` at the root URL and could never reach the login form. Existing browsers worked only because their cookie from a past login satisfied the gate. The middleware now early-exits for any path that doesn't start with `/api/`; the SPA's own AuthGate handles client-side route protection. Auth test suite extended with three SPA-pass-through cases (`/`, `/login`, `/welcome`).
- **`app.set('trust proxy', 1)`.** Required behind the Cloudflare tunnel so `req.ip` / `req.secure` / `req.protocol` reflect the real client, not the Docker network. The session-cookie `secure` flag had its own `x-forwarded-proto` workaround already; this is hygiene for everything else (rate limiting, future audit logs).
- **Catalog images consolidated and Dockerfile-baked.** The monstera image rendered as a broken-image icon because `docker-compose.yml` mounted the legacy project-root `./assets` over `/app/assets`, shadowing the actual `catalog-images/` dir. Three changes: compose now mounts `./packages/api/assets`, the Dockerfile copies `assets/` into both build and runtime stages so production images are self-contained, and the legacy root `./assets/{ornaments,placeholder-plant.svg,seed-facts.json}` were `git mv`'d into `packages/api/assets/` so all assets live in one place. Backfilled `illustration_path` on the two existing Monstera plant rows that pre-dated Wave 9's catalog→plant copy on POST.

### Catalog expansion — 250 → 444 species (2026-04-26)

- **+194 catalog entries** added across all 12 categories. Per-category counts now: foliage 108, succulents 57, flowering 47, cacti 32, orchids 26, ferns/herbs/indoor_trees/palms/carnivorous/terrarium 25, air_plants 24. Every category meets the ≥25 minimum and the +50% growth target (foliage: 72→108, succulents: 38→57, flowering: 31→47, cacti: 21→32; air_plants/herbs/ferns/indoor_trees/orchids/palms/carnivorous/terrarium each grown to ≥25 from much smaller bases).
- **2,910 new unique facts** added (15 per entry, all globally unique against the existing 3,750). Catalog now carries 6,660 unique species facts in total.
- Notable additions: full Tillandsia diversity (bulbosa, fuchsii, magnusiana, velutina, tectorum, brachycaulos, etc.); collector-grade Philodendron / Monstera / Alocasia / Calathea cultivars (White Princess, Florida Ghost, Black Velvet, Frydek, Dragon Scale, musaica, ornata); long-overdue herb staples (lavender, marjoram, dill, fennel, tarragon, lemon balm, lemongrass, stevia, lemon verbena, hyssop, lovage, sorrel-style perilla, nasturtium); jewel orchids (Ludisia, Macodes), Paphiopedilum / Vanda / Miltoniopsis; Drosera / Sarracenia / Nepenthes / Pinguicula deepening; Lithops, Aeonium, Pachypodium, Euphorbia (obesa, tirucalli), Adenium, Senecio strings; Ficus benjamina/microcarpa/religiosa, citrus, olive, coffee for indoor_trees; Cycas/Zamia, Bismarckia, Bottle/Triangle palms; mosses, Cryptanthus, Bucephalandra, Anubias, Marsilea for terrarium/paludarium use.
- Implementation: 13 parallel sub-agents (one per category, foliage split into A+B halves) produced JSON entries against the schema; a global cross-batch validator confirmed zero slug/Latin/fact collisions before merge. Loader test (50 cases) and catalog/facts/conditions test suites (91 cases total) all pass against the new file. API rebooted clean against the strict-at-boot loader.

### Wave 13 — Plant detail structural rework (2026-04-26)

- **#134** Plant passport IA scaffolding: new `CollapsibleSection` primitive, image hero promoted to the top of the plant detail page, History section wrapped as a proof-of-concept. Full passport-order reorder of remaining sections deferred to child issues #139–#143 (reorder, hero redesign, "this plant" consolidation, sticky in-page nav, origin & lore narrative card).
- **#133** Common conditions UI: replaced ad-hoc inline rendering with the new `ConditionCard` primitive — identical-height collapsible cards with severity icons (⚠ warning, ℹ info), tag chips at fixed minimum width, optional `actionSlot` for the existing "Flag as active" interaction. Multiple cards can expand simultaneously. URL-persisted expand state intentionally dropped (diverges from issue AC) — local React state only.
- **#60** Calibration UX: explanation tooltip ("Why am I being asked this?") with first-visit pulse, "Calibration N of ~5" progress in modal title, calibration progress pill on plant detail Schedule section, 🌿 dialed-in badge on PlantCard. New `convergence_event` field on `POST /api/plants/:id/calibration` response (`'converged'` / `'drifted'` / `null`); new `calibration_converged` and `calibration_drift_detected` event types in `event_log`. CalibrationModal shows an inline transition message in its result card; CalibrationSequence flashes a brief banner above the next question. Drift detection uses the existing convergence reset logic (the algorithm auto-flips `is_converged` 1→0 on a non-3 answer); a richer "drift from mean" model is filed as a v1.1 follow-up.

### Wave 12 — Polish & feedback (2026-04-26)

- **Date strip (#126):** today is now rendered as a filled green tile with white text, while a separately-selected day uses a muted-fill + outline treatment — the two states look distinct. The strip now spans 11 days (5 back + today + 5 ahead) instead of 7-forward and auto-scrolls today into the centre on mount. New optional `?days=N` param on `GET /api/schedule/week` (default 7, range 1–30, back-compat).
- **Archive flow & memorial page (#135):** archiving a plant now navigates immediately to a new `/archive/:id` *in memoriam* page (no more 3-second delay before bouncing to a half-scrolled dashboard). The page hides the watering schedule, conditions, notes editor, archive button, and current pot size, and instead shows a stats grid (waterings, offspring, calibration cycles, lifespan), the cause, past-tense location, and a small Restore action. Visiting `/plants/:id` for an archived plant redirects to the memorial page. The archive index now links to memorial pages directly. `POST /api/plants/:id/restore` un-archives a plant, re-enables its species facts, and logs a `restored` event.

### Wave 9 — Hardening (2026-04-25)

- **Auth gate (#136):** New bootstrap-token + session-cookie auth on the API. Fresh installs must claim the instance via the `/welcome` page using a one-time setup token printed in the server logs. After bootstrap all `/api/*` routes (except `/api/auth/*` and `/api/feedback`) require a valid session. SPA `/login` page handles return visits. `scripts/reset-password.js` clears credentials offline. INSTALL.md documents the bootstrap flow.
- **Top-level `ErrorBoundary`** (no GH issue): wraps the app so an uncaught render error shows a friendly fallback with a Reload button instead of blanking the whole page.
- **Hamburger menu state polish (#124):** suppressed the iOS Safari blue tap-highlight + scoped focus styling to keyboard navigation only via `:focus-visible`.
- **Plant images on detail page (#132, monstera-only):** new `/api/illustrations/:filename` static endpoint. Catalog entries can now declare an `image_path`; the value is copied to `plants.illustration_path` on POST when a catalog match is found. First catalog image: a botanical illustration of *Monstera deliciosa Albo Variegata*. Plant detail page renders the image when present, falls back to the 🪴 emoji.
- **Stale "enrichment pending" UI hidden when no AI tool active (#131):** new `GET /api/system/ai-connection` heuristic (recent `enrichment_complete` event ⇒ "connected"). PlantCard hides the badge and PlantDetail swaps the wait banner for a "Connect an AI tool" CTA when no AI tool has been seen in the last 7 days.

### Changed
- **Architecture:** All in-process LLM calls removed. plnt-trmnl now exposes a pull-based enrichment API; users connect their own AI tool (Claude Desktop scheduled task, ChatGPT scheduled tasks, Cursor, Ollama + cron, n8n, etc.).
- **Catalog:** Expanded from 30 → 250 species across 12 categories (added `orchids`, `carnivorous`, `herbs`, `terrarium`). 60+ cultivars/variegated forms across major collector genera (Monstera, Pothos, Philodendron, Sansevieria, Ficus, Echeveria, Calathea, Aglaonema). Phalaenopsis migrated from `flowering` to its new `orchids` category.
- **Settings:** New "Connect your AI" section with a "Copy AI setup prompt" button that copies a ready-to-paste prompt teaching the user's AI which endpoints to call.

### Added
- `GET /api/plants?enrichment=pending` — list plants needing enrichment.
- `POST /api/plants/:id/enrichment` — receive enrichment payload (alias to the existing callback endpoint).
- `GET /api/conditions?care_update=pending` — list conditions awaiting care suggestions.
- `POST /api/conditions/:id/care-update` — receive AI-suggested care adjustment.
- `GET /api/facts/samples?n=10` — random facts as style anchors for the AI setup prompt.
- `INSTALL.md` — full install guide for newcomers.
- `ROADMAP.md` — forward plan (Waves 9–14).
- `docs/RELEASE-PROCESS.md` — maintainer playbook including the pre-public-flip checklist.
- `docs/archive/` — historical wave plans/designs/manual-tests for Waves 1–8 (moved out of the active `docs/plans/` and `docs/specs/` directories).
- `scripts/pre-flip-audit.sh` and `scripts/audit-issues.sh` — pre-publish hygiene tooling.

### Fixed
- **Calibration crash that blanked the entire app.** `GET /api/calibration/due` returned plants without their `question` field, but `CalibrationModal` reads `plant.question.question_text` directly. When a plant was due for calibration today and had no questions seeded (e.g. `enrichment_status = failed` from the legacy SDK era), the modal threw an uncaught `TypeError` and React unmounted the whole tree. The route now joins each due plant with its next calibration question and filters out plants that have none.

### Removed
- `@anthropic-ai/claude-agent-sdk` dependency.
- `packages/api/src/enrichment/claude-enrich.ts` (286 lines).

### Security
- N/A (auth on enrichment endpoints remains a known limitation, slated for v1.1.)

## [0.7.0] — 2026-04-25

### Removed
- n8n enrichment client (`webhook.ts`, `retry.ts` and their tests). The n8n env vars `N8N_ENRICHMENT_WEBHOOK_URL` and `N8N_ENRICHMENT_MAX_RETRIES` are no longer read.

### Fixed
- AddPlant post-add enrichment splash test flake (intermittent timeouts on `findByRole('dialog')`).

## [0.6.0] — 2026-04-24

### Changed
- App renamed to **PLNT** in user-visible copy.

### Added
- 🪴 favicon + PWA manifest (full PWA install lands in v1.1).
- Hamburger menu in top-nav with focus-trapped drawer, Escape close, backdrop click, route-change auto-close, body scroll lock.
- About page stub at `/about`.

### Removed
- Vacation toggle from Dashboard (UI-hidden; the underlying scheduling path and `/vacation-start` / `/vacation-end` routes remain functional).

## [0.5.0] — 2026-04-24

### Added
- Plant catalog foundation: 30 curated species with care, light profile, placement tips, 15 conditions, 15 facts, origin, lore, etymology.
- Catalog endpoints: `/api/catalog/search`, `/api/catalog/suggest`, `/api/catalog/entry`.
- AddPlant catalog dropdown with free-text fallback (#2).
- Rich care profiles (light, placement, top 15 conditions per species) on the plant detail page (#3).
- Daily fact rotation: TRMNL screen picks the least-recently-shown fact at 6 AM, resets when the species cycle is exhausted (#38).
- "Did you mean…" suggestion fallback for misspelled plant names (#39).
- "About this plant" card on detail page (#37).
- Settings page (`/settings`) with a "Show developer info" toggle.
- Conditions picker on plant detail with generic + species-specific sections (#75).
- Soil-feel seeds calibration when last-watered date is unknown (#70).
- Light-level help tooltip on AddPlant (#71).
- Image attachments on feedback submissions (#77).
- Post-add enrichment splash confirms species + care preview (#72).

### Changed
- Dry-soil-aware calibration: replaces the previous interval-tweak model with a `dry-days-target` semantic with growing-season (× 0.8) and dormancy (× 1.3) multipliers stacked multiplicatively with each plant's `heating_season_modifier` (#36).
- Prominent species header on the plant detail page (#74).

## [0.4.0] — 2026-04-23

### Added
- End-to-end watering lifecycle integration test covering Wave 2 features (#9).
- Archived plants view (#33).
- Plant origin story (purchased / received / seedling / unknown) with mother plant references (#35).
- Stats card + calibration trend UI on plant detail (#16).
- Timestamped notes log via a new `plant_notes` table (#32).

### Changed
- Condition resolve URL fix (#34).
- Vitest fork cap (`maxForks: 2`, `pool: forks`) after a second resource-exhaustion freeze; full post-mortem at `docs/incidents/2026-04-23-vitest-resource-exhaustion.md`.

### Removed
- Legacy `plants.notes` column (replaced by `plant_notes` table).

## [0.3.0] — 2026-04-22

### Added
- Batch water with batch undo toast (#11).
- 7-day calendar strip on Dashboard (#12).
- Pot size categories (Extra Small / Small / Medium / Large / Extra Large / Other) (#31).
- Bin-packer scheduling overflow / rebalance — every `next_water_date` mutation now goes through `scheduleNextWater` + `logScheduleEvents` (#6).
- Reason-specific memorial toasts on archive (#30).

### Changed
- Archive dialog CSS polish (#29).

### Fixed
- JSON render in event timeline (#25).
- Undo countdown stuck at 15s (#26).
- Watered button regression (#27).
- Flag-condition flow (#28).

## [0.2.0] — 2026-04-22

### Added
- Welcome empty state with first-plant hints + celebration toast (#13).
- Undo-water with 15-second window and full state restoration (#14).
- Seasonal modifier applied to scheduling (#15).
- Archive flow with reason / note / memorial UI (#17).

## [0.1.0] — 2026-04-22

### Added
- Plant identifier field (#10).
- Docker compose hygiene pass (#8).
- Feedback submission system with screenshot attachments (#19).

## [0.0.1] — 2026-04-07

### Added
- Initial scaffold: API container (`plant-api` :3900), renderer container (`plant-renderer` :3901), TRMNL webhook push integration, SQLite (WAL), Express 5, React 19 + Vite, Docker Compose.
