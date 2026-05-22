# Roadmap

Forward-looking plan for plnt-trmnl. **Each wave below is a placeholder — design and implementation plans get written when we pick the wave up.** This file is the index, not the spec.

For shipped work, see [`CHANGELOG.md`](CHANGELOG.md). For the current snapshot, see [`docs/HANDOFF.md`](docs/HANDOFF.md).

---

## Status

- **Waves 1–10 + 12 + 13 + 15 + 17 + 19 shipped.** Catalog at 444 species across 12 categories. Pull-based enrichment API live. Auth gate, ErrorBoundary, plant-image plumbing, AddPlant polish, date-strip rework, memorial page redesign, plant-detail passport-IA scaffolding, calibration UX, Wave 17 dog-food + design-system burndown, Wave 15 PWA install + offline, Wave 19 dog-food round 2 (chip/toast desync, splash branching, mother-plant filter, /add validation + UX cluster, emoji sweep round 2, Header polish) — all in.
- **Repo is public** (flipped 2026-05-05). Storybook catalog live at https://tsipotU.github.io/plnt-trmnl/. Branch protection on `main` with required status checks + squash-merge + auto-merge. `PLNT` wordmark consolidated to `p7l` (PR #151, 2026-05-06). v1.0.0 not yet tagged — **gated on the illustration pipeline ([#138](https://github.com/tsipotU/plnt-trmnl/issues/138))**, not on user satisfaction as the prior wrap implied. Per Emiel's directive 2026-05-07: "we need images for every plant before i will label it v1." Catalog has 444 species, only 1 has `image_path` today.
- **Wave 19 closed 2026-05-07** — 8 dog-food issues shipped via 9 PRs (one fix-up PR for missing test coverage). Watering chip/toast desync fixed by combining "Schedule" cell ([#202](https://github.com/tsipotU/plnt-trmnl/issues/202)); mother-plant picker now filters to same species ([#208](https://github.com/tsipotU/plnt-trmnl/issues/208)); EnrichmentSplash branches on client `catalogSlug` state instead of derived `illustration_path` ([#204](https://github.com/tsipotU/plnt-trmnl/issues/204)); /add form validation with required signals + inline errors + ARIA ([#207](https://github.com/tsipotU/plnt-trmnl/issues/207)); /add placeholders concrete ([#205](https://github.com/tsipotU/plnt-trmnl/issues/205)); pot-size labels Tiny/Huge + tooltip absolute-scope clarification ([#206](https://github.com/tsipotU/plnt-trmnl/issues/206)); emoji sweep round 2 on auto-log + EnrichmentSplash ([#203](https://github.com/tsipotU/plnt-trmnl/issues/203)); Header drops emoji + wordmark font verified ([#201](https://github.com/tsipotU/plnt-trmnl/issues/201)). Cross-wave review filed [#221](https://github.com/tsipotU/plnt-trmnl/issues/221) as a follow-up for emoji surfaces outside #203's explicit scope. Spec + plan at `docs/specs/2026-05-07-wave-19-design.md` and `docs/plans/2026-05-07-wave-19-plan.md`.
- **Wave 17 closed 2026-05-06** — all 18 issues resolved across two burndown sessions. Vacation mode sunset, nav-surface design pass + undefined-token sweep, humanized water-state labels, plant-image lightbox + dashboard rendering, archive flow polish, iOS auto-zoom fix, tooltip overflow-clipping fix, calendar today-cell alignment, dynamic version display, native PTR disabled, BackBar narrow-viewport fix, FilterRail stray-line fix, feedback FAB restyle, add-note empty-state button.
- **Wave 14 deferred entirely (2026-05-07)** — design surfaced a brand-bridge gap: Storybook is the canonical brand catalog for the web/PWA surface but does not extend onto the TRMNL rendering surface. [#7](https://github.com/tsipotU/plnt-trmnl/issues/7) (template redesign), [#138](https://github.com/tsipotU/plnt-trmnl/issues/138) (illustration pipeline), and [#55](https://github.com/tsipotU/plnt-trmnl/issues/55) (TRMNL-X dual-res, formerly Wave 15) all moved to v1.1 backlog. **New issue [#197](https://github.com/tsipotU/plnt-trmnl/issues/197)** opened for the broader bridge work.
- **Wave 15 closed 2026-05-07** — [#59](https://github.com/tsipotU/plnt-trmnl/issues/59) PWA install + offline shipped (PR [#199](https://github.com/tsipotU/plnt-trmnl/pull/199)). Refreshed the issue first to drop the obsolete 🪴-emoji icon approach and ground the work in the design system: `ApothecaryStamp` is the single source of truth, exported via `prebuild` script to bone (light) + slate (dark) plate variants. Workbox SW with precache + SWR + Background Sync queues for water/calibration/archive mutations. Wave 15 milestone renamed to "Wave 15 — PWA" (TRMNL-X dropped).
- **Wave 16 closed 2026-05-07** — [#40](https://github.com/tsipotU/plnt-trmnl/issues/40) (holistic design pass) closed as obsolete-by-incremental-delivery; the design system + Waves 6/13/17 already covered every acceptance criterion. Per-section PlantDetail redesigns scoped to Wave 18 (post-v1.0).
- **Now:** illustration pipeline ([#138](https://github.com/tsipotU/plnt-trmnl/issues/138)) is the actual v1.0.0 blocker. Currently v1.1 backlog with the generator-source decision still open (paid API vs self-hosted vs LLM-SVG vs hand-commissioned). Once a generator ships and the catalog is populated, v1.0.0 is on the table. Pending too: on-device verification of #59 PWA (Add to Home Screen, offline read, queue replay, Lighthouse PWA ≥90).
- **Open child issues from Wave 13** (bundled into Wave 18): [#139](https://github.com/tsipotU/plnt-trmnl/issues/139), [#140](https://github.com/tsipotU/plnt-trmnl/issues/140), [#141](https://github.com/tsipotU/plnt-trmnl/issues/141), [#142](https://github.com/tsipotU/plnt-trmnl/issues/142), [#143](https://github.com/tsipotU/plnt-trmnl/issues/143), plus [#168](https://github.com/tsipotU/plnt-trmnl/issues/168).

## Shipped waves (1–10 + 12 + 13 + 15 + 17 + 19)

For each shipped wave's full scope and outcome, see [`CHANGELOG.md`](CHANGELOG.md). Specs and plans live under [`docs/specs/`](docs/specs/) and [`docs/plans/`](docs/plans/) (current waves) and [`docs/archive/`](docs/archive/) (Waves 1–8). Wave 11 was deferred and re-bundled into Wave 14 below.

## ~~Wave 19 — Dog-food round 2~~ — **shipped 2026-05-07**

**Status:** Closed. 8 issues shipped via 9 PRs (one continuous burndown + one test fix-up). All 11 feedback rows mapped to Wave 19 issues flipped to `done`; Wave 19 milestone closed. Spec at `docs/specs/2026-05-07-wave-19-design.md`; plan at `docs/plans/2026-05-07-wave-19-plan.md`.

**What shipped:**

- Watering chip/toast "desync" fixed by combining "Schedule" cell — `Every 10d · Next: 15 May 2026` ([#202](https://github.com/tsipotU/plnt-trmnl/issues/202)). Root cause was the bin-packer intentionally shifting `next_water_date` ±N days for load balancing; both chip and toast were correct, the fix was to surface the offset.
- Mother-plant picker filters to same species via `normalizeSpecies` helper, with empty-state and "select a species first" hints ([#208](https://github.com/tsipotU/plnt-trmnl/issues/208)).
- EnrichmentSplash branches on client-side `catalogSlug` state (the typeahead's source-of-truth signal) instead of the derived `illustration_path` (frequently null until #138 ships) ([#204](https://github.com/tsipotU/plnt-trmnl/issues/204)).
- /add form validation: `INLINE_REQUIRED_FIELDS = ['name']`, validation gate at top of submit handler, inline error rendering with `aria-required` / `aria-invalid` / `role="alert"`, focus management to first invalid, errors clear on edit ([#207](https://github.com/tsipotU/plnt-trmnl/issues/207)). Aligns with FINE framework.
- /add placeholders use concrete personal-nickname examples ([#205](https://github.com/tsipotU/plnt-trmnl/issues/205)).
- Pot-size labels: `Extra Small (8 cm)` → `Tiny (8 cm)`, `Extra Large (30 cm)` → `Huge (30 cm)`. `value` strings + cm values unchanged for back-compat. Tooltip clarifies sizes are absolute (rim diameter) ([#206](https://github.com/tsipotU/plnt-trmnl/issues/206)).
- Emoji sweep round 2 on care-log icons + EnrichmentSplash ([#203](https://github.com/tsipotU/plnt-trmnl/issues/203)). New `camera` Pictogram catalog entry. Typographic glyphs (✎ ✓ ↔ ⤵) retained per the sweep convention.
- Header drops 🪴 emoji; wordmark uses `var(--font-display)` (Fraunces, per Foundations/Naming.mdx) ([#201](https://github.com/tsipotU/plnt-trmnl/issues/201)).

**Folded forward to v1.1 backlog:**

- [#209](https://github.com/tsipotU/plnt-trmnl/issues/209) — Distinct profile-pic illustration variant (depends on #138 generator decision).
- [#210](https://github.com/tsipotU/plnt-trmnl/issues/210) — Add-flow / Enriching screen holistic UX rework (FB#43 flow concern; symptom fixes via #204/#205/#206/#207 cover the worst pain in the meantime).
- [#211](https://github.com/tsipotU/plnt-trmnl/issues/211) — Generalisable condition-warning acknowledgement / dismiss pattern (architectural commitment, better designed once with all warning kinds in mind).

**Filed as follow-up:**

- [#221](https://github.com/tsipotU/plnt-trmnl/issues/221) — Emoji sweep round 3. Wave 19's #203 was scoped to two surfaces (care-log + EnrichmentSplash); the wave's spec exit criterion ("no decorative emoji") was overspecified vs that scope. PlantCard, Dashboard, ErrorBoundary, CalibrationModal, CalibrationSequence, DidYouMeanSplash, archive emoji in MemorialPlant / ArchivedPlants / PlantDetailSheets all need a per-case decision (Pictogram / remove / semantic-keep).

**Closed milestones (housekeeping during the wave-end gate):** Wave 19 (#21), Wave 17 (#17, overdue), Wave 15 (#15, overdue).

**Test baseline at end of wave:** API 557 + client 241 + renderer 60 = 858 tests pass.

For per-PR details see `CHANGELOG.md` Wave 19 section.

## ~~Wave 17 — Dog-food polish + sunset~~ — **shipped 2026-05-06**

**Status:** Closed. All 18 milestone issues resolved across two burndown sessions on 2026-05-06.

**What shipped:**

- Vacation mode sunset permanently ([#166](https://github.com/tsipotU/plnt-trmnl/issues/166))
- Navigational surface design pass + undefined-token sweep ([#169](https://github.com/tsipotU/plnt-trmnl/issues/169) + [#170](https://github.com/tsipotU/plnt-trmnl/issues/170), closed [#156](https://github.com/tsipotU/plnt-trmnl/issues/156) as side-effect)
- Humanized water-state labels everywhere ([#167](https://github.com/tsipotU/plnt-trmnl/issues/167))
- Plant-image lightbox on detail page ([#162](https://github.com/tsipotU/plnt-trmnl/issues/162))
- Plant-image rendering + fallback on dashboard rows ([#173](https://github.com/tsipotU/plnt-trmnl/issues/173))
- Calendar today-cell visual fix ([#174](https://github.com/tsipotU/plnt-trmnl/issues/174))
- Archive flow polish — single archive entry point + softer copy ([#164](https://github.com/tsipotU/plnt-trmnl/issues/164))
- iOS auto-zoom fix on form controls ([#158](https://github.com/tsipotU/plnt-trmnl/issues/158))
- Tooltip overflow-clipping fix on /add ([#157](https://github.com/tsipotU/plnt-trmnl/issues/157))
- FilterRail stray-line fix on /feedback ([#159](https://github.com/tsipotU/plnt-trmnl/issues/159))
- Feedback FAB icon + position ([#165](https://github.com/tsipotU/plnt-trmnl/issues/165))
- BackBar narrow-viewport fix ([#161](https://github.com/tsipotU/plnt-trmnl/issues/161))
- Dynamic version display ([#171](https://github.com/tsipotU/plnt-trmnl/issues/171))
- Native PTR disabled ([#172](https://github.com/tsipotU/plnt-trmnl/issues/172))
- Add-note empty-state button ([#176](https://github.com/tsipotU/plnt-trmnl/issues/176), refile of [#160](https://github.com/tsipotU/plnt-trmnl/issues/160))

**Closed without code change:** [#155](https://github.com/tsipotU/plnt-trmnl/issues/155) (dup of [#163](https://github.com/tsipotU/plnt-trmnl/issues/163), absorbed into the broader task-ribbon redesign in v1.1).

**Folded forward:**
- [#163](https://github.com/tsipotU/plnt-trmnl/issues/163) — task ribbon info+log panel (feature, needs spec → v1.1 backlog)
- [#168](https://github.com/tsipotU/plnt-trmnl/issues/168) — common conditions card collapse + width (folds into Wave 18 passport IA)

For per-PR details see `CHANGELOG.md` `[Unreleased]` Wave 17 entries.

## ~~Wave 14 — TRMNL identity~~ — **deferred 2026-05-07**

**Status:** Closed without shipped code. All three issues moved to v1.1 backlog. Trigger: design surfaced that #7's scope (rewrite the Liquid template) was a symptom of a larger gap — the design system covers web/PWA but doesn't extend onto the TRMNL e-ink surface.

**Deferred:**
- [#7](https://github.com/tsipotU/plnt-trmnl/issues/7) → v1.1 — TRMNL template visual redesign.
- [#138](https://github.com/tsipotU/plnt-trmnl/issues/138) → v1.1 — Two-variant illustration pipeline.
- [#55](https://github.com/tsipotU/plnt-trmnl/issues/55) → v1.1 (originally Wave 15) — TRMNL-X dual-resolution support.

**Tracking the broader work:** [#197](https://github.com/tsipotU/plnt-trmnl/issues/197) — "Formalize p7l brand identity for TRMNL renderings (Storybook bridge)." Proposed approach: LiquidJS-in-Storybook with the TRMNL framework v3.1 CSS as a decorator, OG + X stories, single source of truth for brand decisions on the TRMNL surface.

**Research artifacts kept:**
- `docs/plans/2026-05-06-issue-7-trmnl-template-design.md` — framework-primitive design plan (carries a deferred-admonition header).
- `docs/reference/trmnl-framework-3.1/` — full cached TRMNL framework v3.1 documentation (32 markdown files).
- Two placeholder Storybook stories under "TRMNL screens / Placeholder" claiming the catalog surface for the future bridge.

## ~~Wave 15 — PWA~~ — **shipped 2026-05-07**

**Status:** Closed. [#59](https://github.com/tsipotU/plnt-trmnl/issues/59) shipped via PR [#199](https://github.com/tsipotU/plnt-trmnl/pull/199). Originally scoped as "PWA + TRMNL-X" but #55 was deferred alongside Wave 14; milestone renamed to "Wave 15 — PWA" once that landed.

**What shipped:**
- Issue #59 was refreshed before implementation — the original ticket called for a 🪴-emoji icon and `name: "Plant TRMNL"`, both predating the post-Wave-17 design system. Replaced with a design-system-grounded approach.
- Icon export from `ApothecaryStamp` as single source of truth: `packages/api/client/scripts/build-app-icons.ts` server-renders the design-system stamp with `microtextOff` inside canonical AppIcon plates (bone + slate), `sharp` rasterizes to PNG at 192/512/180. Same script also emits a mode-aware `favicon.svg` and 16/32 PNG fallbacks. Wired as `prebuild` so PNGs never drift from the React component.
- `vite-plugin-pwa` integration: manifest with `name: "p7l"`, `display: "standalone"`, brand-aligned colors, dual `media: "(prefers-color-scheme: …)"` icon entries.
- Workbox SW: app-shell precache (24 entries), SWR for GET reads, Background Sync queues for water/calibration/archive mutations (24h retention).
- HTML head: `viewport-fit=cover` for notch flow, dual `<meta name="theme-color">` for light/dark, dual `apple-touch-icon` for iOS 17.4+ mode-aware home-screen icons.
- Storybook isolated from PWA pipeline via `viteFinal` strip so SB's own multi-MB chunks don't trip Workbox's 2 MiB precache cap.
- Legacy 🪴 emoji assets deleted: `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `favicon-64.png`, hand-edited `manifest.webmanifest`.

**Pending verification (manual, post-deploy):** Add to Home Screen on iPhone (verify stamp icon, dark mode shows slate plate); offline read of `/api/plants` cached; water-mutation queue replay on reconnect; Lighthouse PWA audit ≥ 90.

## ~~Wave 16 — Holistic polish + v1.0.0 release~~ — **closed 2026-05-07 (no shipped code)**

**Status:** Closed. [#40](https://github.com/tsipotU/plnt-trmnl/issues/40) (holistic frontend design pass) closed as obsolete-by-incremental-delivery; every acceptance criterion was already addressed by Waves 6 (empty state, manifest), 13 (PlantDetail rework, calibration UX), 17 (archive polish, dashboard rendering, navigational surface design pass) plus the design system itself. Per-section PlantDetail redesigns scoped to Wave 18 (post-v1.0).

**Path to v1.0.0:** no functional waves remain. Tag is gated on user satisfaction, not work. When ready: tag v1.0.0, draft GitHub Release notes from CHANGELOG `[Unreleased]` → `[1.0.0]`, run README + INSTALL final pass, announce on TRMNL Discord, TRMNL forum, /r/houseplants, /r/selfhosted, HN.

**Deferred to a polish lap before tag (informal, not an issue):** Native Dutch-name audit on the 444-plant catalog (Emiel). Walk-the-app phone-on-bedside-table polish — file individual issues for any rough edges that surface.

**Already done** (landed before this wave was picked up):
- Repo flipped public (2026-05-05). History scrubbed via `git filter-repo`. Pre-flip audit green.
- `LICENSE` (MIT), `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CODEOWNERS`.
- `.github/ISSUE_TEMPLATE/{bug,feature}.md`, `.github/pull_request_template.md`.
- `.github/workflows/test.yml` (CI), `.github/workflows/storybook.yml` (GH Pages).
- Branch protection on `main` with required status checks + squash-merge only + auto-merge.
- `.github/dependabot.yml`, `.nvmrc`, `.editorconfig`.
- `scripts/pre-flip-audit.sh`, `scripts/audit-issues.sh`, `scripts/filter-repo-replacements.txt`.

**Likely outputs:** `docs/plans/<date>-wave-16-plan.md`, v1.0.0 tag, release notes, announcement.

## Wave 18 — Plant detail passport IA (post-v1.0)

**Status:** Queued for after v1.0 tag.

**Goal:** Land the passport-IA rethink for the plant detail page that Wave 13 scaffolded but only partially redesigned. By v1.0 the plant detail page will have shipped pieces of this IA in placeholder form; Wave 18 unifies them into the full reorder.

**Scope:**
- [#139](https://github.com/tsipotU/plnt-trmnl/issues/139) — Full passport-order section reorder
- [#140](https://github.com/tsipotU/plnt-trmnl/issues/140) — Hero block visual redesign
- [#141](https://github.com/tsipotU/plnt-trmnl/issues/141) — "This plant" section consolidation
- [#142](https://github.com/tsipotU/plnt-trmnl/issues/142) — Sticky in-page nav for long pages
- [#143](https://github.com/tsipotU/plnt-trmnl/issues/143) — Origin & lore narrative card
- [#168](https://github.com/tsipotU/plnt-trmnl/issues/168) — "Common conditions" cards collapse + uniform width (dog-food-surfaced 2026-05-06; folded in here because it overlaps with the section reorder)

**Likely outputs:** `docs/plans/<date>-wave-18-plan.md`, refactored `PlantDetail.tsx` with the new section order, MDX docs page in Storybook for the passport-IA pattern.

---

## Won't-fix / closed

- [#18](https://github.com/tsipotU/plnt-trmnl/issues/18) — **Auto-detect conditions from calibration patterns.** Closed 2026-04-26 as not-planned. Signal-to-noise on unsupervised pattern detection from calibration answers is too low to be trusted (mixes season, location, pot size, soil mix, plant-specific drift). The calibration loop already covers the practical case implicitly. Revisit only if a future use case actually demands it.

## v1.1 backlog (post-flip, before v2)

Things that shouldn't block v1.0 but should land soon after.

- **TRMNL surface bridge** ([#197](https://github.com/tsipotU/plnt-trmnl/issues/197), [#7](https://github.com/tsipotU/plnt-trmnl/issues/7), [#138](https://github.com/tsipotU/plnt-trmnl/issues/138), [#55](https://github.com/tsipotU/plnt-trmnl/issues/55)) — formalize p7l brand identity for TRMNL renderings via Storybook. **#197** is the seed: render the production Liquid template inside Storybook with LiquidJS + TRMNL framework v3.1 CSS as a decorator, OG + X stories per screen state, brand decisions captured as design tokens. Once landed, **#7** (template visual redesign), **#138** (illustration pipeline + generator pick), and **#55** (TRMNL-X dual-resolution renderer) all flow naturally — a single wave can ship the bridge, the redesigned template, and the X output together. Research artifacts already in repo: `docs/plans/2026-05-06-issue-7-trmnl-template-design.md`, `docs/reference/trmnl-framework-3.1/`.
- [#144](https://github.com/tsipotU/plnt-trmnl/issues/144) — **Auth modernization — better-auth + passkeys + device list.** Current auth is hand-rolled bcrypt + a single global password + cookie sessions. Adequate (especially after the 2026-04-26 hotfix that scoped the gate to `/api/*` so fresh devices can reach `/login`), but lacks: per-device session visibility, "revoke iPhone" without nuking everything, passkey support (one-tap login via Face ID/Touch ID, iCloud-synced across devices), and any path to MFA later. Plan: migrate to [`better-auth`](https://www.better-auth.com/) — TypeScript-first Express-friendly library with passkeys/password/sessions/device-list out of the box, no extra container. Keeps password as fallback, keeps the bootstrap setup-token flow. Single-tenant remains (no multi-user). Estimated 1 wave (~3-5 commits).
- **Catalog illustrations rollout.** Catalog is now 444 species but only 1 has an `image_path` (monstera-deliciosa-albo-variegata). The deferred [#138](https://github.com/tsipotU/plnt-trmnl/issues/138) illustration pipeline produces the variants per species once a generator is picked; v1.1 is when we actually populate the catalog. Auto-backfill `plants.illustration_path` at boot (when a plant's species matches a catalog entry that has `image_path` and the column is NULL) so users with pre-existing plants get images for free as new illustrations land.
- **"Drift from mean" calibration model.** Wave 13 added drift detection using the existing convergence-reset logic (a non-3 answer flips `is_converged` 1→0). A richer model that tracks mean dry-days over the last N cycles and flags meaningful deviation is the proper fix.
- [#148](https://github.com/tsipotU/plnt-trmnl/issues/148) — **Plants list category filter.** Phase 3 visual rebuild ships the state filter rail but not the category rail because `/api/plants` rows don't expose `category`. Resolution: LEFT JOIN catalog into `/api/plants` for `category`. (The vacation half of the original issue is sunset by [#166](https://github.com/tsipotU/plnt-trmnl/issues/166).)
- [#152](https://github.com/tsipotU/plnt-trmnl/issues/152) — **Calendar subscription feed (iCalendar / `.ics`).** p7l already owns the schedule machinery — surface it as a read-only iCal feed users can subscribe to in Apple Calendar / Google Calendar / Outlook. One per-user secret URL, events for upcoming waterings (and later: propagation milestones — see v2). Spec-light: serve `text/calendar` from `/api/calendar/<token>.ics`, regenerate on read, no two-way sync. Likely a single small wave.
- [#230](https://github.com/tsipotU/plnt-trmnl/issues/230) — **Vite 8 + Storybook 11 migration.** Unblocks `@vitejs/plugin-react` 6 (which drops Babel and uses Oxc for React Refresh — we don't use Babel plugins, so the migration itself is config-only). Coordinated bump across `vite` 6→8, `@vitejs/plugin-react` 5→6, Storybook 10→11, `@joshwooding/vite-plugin-react-docgen-typescript`. Also verify `vite-plugin-pwa`, the `viteFinal` Storybook override, and the `prebuild` ApothecaryStamp icon export — all touch the Vite plugin chain. Dependabot's #229 ignored at major version; reopen when ready.
- [#242](https://github.com/tsipotU/plnt-trmnl/issues/242) — **Bump Dockerfiles to `node:24-slim` (LTS).** Dependabot keeps offering `node:26-slim` (Current line, non-LTS, 6-month support). Production should graduate Node 22 LTS (Jod) → Node 24 LTS (Krypton, LTS since Oct 2025). Two Dockerfiles affected (`packages/api`, `packages/renderer`). **Verify with `docker compose up -d --build` on the Mac mini** since CI doesn't build images — `test.yml` runs tests on the GitHub runner's Node, not in a container. Dependabot's #233/#235 ignored at major version.

## Post-v1 (v2 backlog)

- [#127](https://github.com/tsipotU/plnt-trmnl/issues/127) — Calendar view (week/month/year grid).
- [#128](https://github.com/tsipotU/plnt-trmnl/issues/128) — "Identify my plant" guided walkthrough.
- [#153](https://github.com/tsipotU/plnt-trmnl/issues/153) — **Propagation guides + calendar-backed propagation projects.** Expand the catalog with per-species *propagation profiles* (multiple methods possible per species: seed, cutting, division, layering, air-layering, grafting), and let users start a "propagation project" that p7l walks them through phase-by-phase using the existing schedule/calendar machinery. Per profile: method, difficulty (with comparator examples — apple/avocado/tomato are all "hard" but for different reasons), expected success rate, time-to-viable-plant, seasonal window, source-plant prerequisites, materials list (incl. final pot + soil + fertilizer), step-by-step process, what success looks like, common failure modes & what to watch for. Frontend: "Propagate" CTA on species/plant page → active project surface alongside the watering calendar. On success, the new plant becomes its own p7l entry and inherits the standard schedule. Catalog/freetext model mirrors the species catalog (curated for common, AI-enrichment fallback). Sizable — full design wave when picked up. Pairs with the v1.1 calendar-feed item (propagation milestones become subscribable events).
- **Multi-user / family accounts.** If p7l ever gets shared use, swap single-tenant for proper users + per-plant ownership/visibility. Builds on the v1.1 auth modernization.

These are good ideas but not v1-blocking. Land them post-flip when there's external interest.

## Deferred / out-of-band

- **Native Dutch-name audit** of the 444-plant catalog (Emiel) — pre-public-flip task. Folded into Wave 16.
- **Dog-food activity log** — short-form notes during the dog-food window, gathered into Wave 12's triage (now done).
