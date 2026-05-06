# Roadmap

Forward-looking plan for plnt-trmnl. **Each wave below is a placeholder — design and implementation plans get written when we pick the wave up.** This file is the index, not the spec.

For shipped work, see [`CHANGELOG.md`](CHANGELOG.md). For the current snapshot, see [`docs/HANDOFF.md`](docs/HANDOFF.md).

---

## Status

- **Waves 1–10 + 12 + 13 shipped.** Catalog at 444 species across 12 categories (expanded from 250 on 2026-04-26). Pull-based enrichment API live. Auth gate, ErrorBoundary, plant-image plumbing (monstera fixture), AddPlant onboarding polish, date-strip rework, memorial page redesign, plant-detail passport-IA scaffolding (CollapsibleSection, ConditionCard primitives), calibration UX (explanation, progress, convergence/drift) all in.
- **Repo is public** (flipped 2026-05-05). Storybook catalog live at https://tsipotU.github.io/plnt-trmnl/. Branch protection on `main` with required status checks + squash-merge + auto-merge. `PLNT` wordmark consolidated to `p7l` (PR #151, 2026-05-06). v1.0.0 not yet tagged — gated on Waves 14–16. See `CHANGELOG.md`.
- **Now:** Wave 17 — Dog-food polish + sunset (16 issues from 2026-05-06 dog-food run, plus the nav-surface design pass and a vacation-mode sunset). Inserted ahead of Wave 14 because the polish + design-system gaps block clean v1.0 work.
- **Next active waves:** 17 → 14 → 15 → 16, in order. v1.0 tag cut at end of Wave 16. Wave 18 (passport IA) follows post-v1.0.
- **Open child issues from Wave 13** (now bundled into Wave 18): [#139](https://github.com/tsipotU/plnt-trmnl/issues/139), [#140](https://github.com/tsipotU/plnt-trmnl/issues/140), [#141](https://github.com/tsipotU/plnt-trmnl/issues/141), [#142](https://github.com/tsipotU/plnt-trmnl/issues/142), [#143](https://github.com/tsipotU/plnt-trmnl/issues/143), plus dog-food-surfaced [#168](https://github.com/tsipotU/plnt-trmnl/issues/168).

## Shipped waves (1–10 + 12 + 13)

For each shipped wave's full scope and outcome, see [`CHANGELOG.md`](CHANGELOG.md). Specs and plans live under [`docs/specs/`](docs/specs/) and [`docs/plans/`](docs/plans/) (current waves) and [`docs/archive/`](docs/archive/) (Waves 1–8). Wave 11 was deferred and re-bundled into Wave 14 below.

## Wave 17 — Dog-food polish + sunset

**Status:** Active (inserted ahead of Wave 14 per groom session 2026-05-06).

**Goal:** Burn down the 17 dog-food issues filed 2026-05-06 + the nav-surface design pass + the vacation-mode sunset. This is the wave that turns "running but rough" into "ready for v1.0 polish." No new features.

**Recommended order:**

1. [#170](https://github.com/tsipotU/plnt-trmnl/issues/170) — `--bg-secondary` token audit (mechanical, unblocks visual review of subsequent components).
2. [#169](https://github.com/tsipotU/plnt-trmnl/issues/169) — p7l navigational surface design pass: 6 new `--nav-*` tokens + Storybook expansion (3 nav molecules + Foundations page) + bind Header/MenuDrawer/HamburgerMenu. Resolves the transparency cluster (in-app feedback rows #29, #30, #24, possibly #21).
3. **High-priority bugs (parallel after #169):**
   - [#160](https://github.com/tsipotU/plnt-trmnl/issues/160) — Notes don't save on plant detail
   - [#155](https://github.com/tsipotU/plnt-trmnl/issues/155) — Repot task scrolls but does nothing (quick fix; #163 is the broader feature)
   - [#156](https://github.com/tsipotU/plnt-trmnl/issues/156) — Foldout menu /add transparent (may close with #169 if surface treatment extends)
4. **Medium bugs:** [#157](https://github.com/tsipotU/plnt-trmnl/issues/157) (mobile tooltip z-index), [#158](https://github.com/tsipotU/plnt-trmnl/issues/158) (zoom after feedback popup), [#161](https://github.com/tsipotU/plnt-trmnl/issues/161) (Today button clipped), [#171](https://github.com/tsipotU/plnt-trmnl/issues/171) (About + Settings hardcoded "v1.0.0" placeholder).
5. **UX polish (cheap, opportunistic):** [#162](https://github.com/tsipotU/plnt-trmnl/issues/162) (image lightbox), [#164](https://github.com/tsipotU/plnt-trmnl/issues/164) (archive flow polish), [#165](https://github.com/tsipotU/plnt-trmnl/issues/165) (feedback button restyle), [#167](https://github.com/tsipotU/plnt-trmnl/issues/167) (humanized water-state labels).
6. [#159](https://github.com/tsipotU/plnt-trmnl/issues/159) — tag-filter line glitch (low priority, slip-friendly).
7. [#166](https://github.com/tsipotU/plnt-trmnl/issues/166) — **Sunset vacation mode** last (destructive change touching API + client + schema + docs; do it once other work is settled to minimize merge conflicts).

**Likely outputs:** `docs/plans/2026-05-XX-wave-17-plan.md`, multiple small PRs (one per cluster), CHANGELOG entries under `[Unreleased]`.

**Excluded from Wave 17 (folded into later waves):**
- [#163](https://github.com/tsipotU/plnt-trmnl/issues/163) — task ribbon info+log panel (feature, needs spec → Wave 19+ / v1.1)
- [#168](https://github.com/tsipotU/plnt-trmnl/issues/168) — common conditions card collapse + width (folds into Wave 18 passport IA)

## Wave 14 — TRMNL identity (template + illustrations)

**Status:** Next functional wave (not yet picked up).

**Scope:**
- [#7](https://github.com/tsipotU/plnt-trmnl/issues/7) — TRMNL template visual redesign matching Lovable mockups. Liquid templates for watering-day-1, watering-day-2, rest-day; title bar + footer; typography hierarchy; calibration prompt with 1–5 scale visual. Touches `docs/trmnl-templates/` only — separate from the SPA.
- [#138](https://github.com/tsipotU/plnt-trmnl/issues/138) — **Two-variant illustration pipeline** (formerly Wave 11). Generation source must be chosen before this can ship. Build-time dithering script (`packages/api/scripts/process-illustration.ts`) using `sharp`, two committed PNGs per species (`<slug>.trmnl-x.png` 1872×1404 16-grey + `<slug>.trmnl-og.png` 800×480 4-grey), convention-based catalog wiring. Generator-agnostic.

**Likely outputs:** Liquid templates committed in `docs/trmnl-templates/`, `process-illustration.ts` script, two committed monstera variants as proof-of-pipeline, catalog loader update, SPA + renderer URL helper.

## Wave 15 — Capabilities for v1 (PWA + TRMNL-X)

**Scope:**
- [#59](https://github.com/tsipotU/plnt-trmnl/issues/59) — PWA: installable home-screen app, service worker for asset cache, web manifest with 🪴 icon, install prompt, offline indicator. Required for v1 mobile feel.
- [#55](https://github.com/tsipotU/plnt-trmnl/issues/55) — TRMNL-X dual-resolution support. Renderer produces two images at different resolutions; push cron decides which to serve based on device-type query param. Pairs with Wave 14's illustration pipeline (which already produces both variants per species).

**Likely outputs:** `docs/plans/<date>-wave-15-plan.md`, `manifest.webmanifest`, service worker, renderer dual-output mode, push-cron device-type routing.

## Wave 16 — Holistic polish + v1.0.0 release

**Goal:** The visual identity pass that turns "shipping pieces" into "one coherent product," then the v1.0.0 tag and announcement.

**Scope:**
- [#40](https://github.com/tsipotU/plnt-trmnl/issues/40) — Holistic frontend design pass. The *last* thing before tag. By now the IA (Wave 13), TRMNL identity (Wave 14), and capabilities (Wave 15) are all in place. This pass unifies palette/typography/spacing across the SPA, polishes empty states and micro-interactions, defines the visual identity that the previous waves used in placeholder form. Visual only, no functional changes.
- Native Dutch-name audit on the 444-plant catalog (Emiel).
- README final pass — every link works, every screenshot reflects shipping reality, every command in `INSTALL.md` runs on a clean machine.
- Tag v1.0.0, draft GitHub Release notes from CHANGELOG `[Unreleased]` → `[1.0.0]`.
- Announce: TRMNL Discord, TRMNL forum, /r/houseplants, /r/selfhosted, HN.

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

- [#144](https://github.com/tsipotU/plnt-trmnl/issues/144) — **Auth modernization — better-auth + passkeys + device list.** Current auth is hand-rolled bcrypt + a single global password + cookie sessions. Adequate (especially after the 2026-04-26 hotfix that scoped the gate to `/api/*` so fresh devices can reach `/login`), but lacks: per-device session visibility, "revoke iPhone" without nuking everything, passkey support (one-tap login via Face ID/Touch ID, iCloud-synced across devices), and any path to MFA later. Plan: migrate to [`better-auth`](https://www.better-auth.com/) — TypeScript-first Express-friendly library with passkeys/password/sessions/device-list out of the box, no extra container. Keeps password as fallback, keeps the bootstrap setup-token flow. Single-tenant remains (no multi-user). Estimated 1 wave (~3-5 commits).
- **Catalog illustrations rollout.** Catalog is now 444 species but only 1 has an `image_path` (monstera-deliciosa-albo-variegata). Wave 14's #138 illustration pipeline produces the variants per species; v1.1 is when we actually populate the catalog. Auto-backfill `plants.illustration_path` at boot (when a plant's species matches a catalog entry that has `image_path` and the column is NULL) so users with pre-existing plants get images for free as new illustrations land.
- **"Drift from mean" calibration model.** Wave 13 added drift detection using the existing convergence-reset logic (a non-3 answer flips `is_converged` 1→0). A richer model that tracks mean dry-days over the last N cycles and flags meaningful deviation is the proper fix.
- [#148](https://github.com/tsipotU/plnt-trmnl/issues/148) — **Plants list category filter.** Phase 3 visual rebuild ships the state filter rail but not the category rail because `/api/plants` rows don't expose `category`. Resolution: LEFT JOIN catalog into `/api/plants` for `category`. (The vacation half of the original issue is sunset by [#166](https://github.com/tsipotU/plnt-trmnl/issues/166).)
- [#152](https://github.com/tsipotU/plnt-trmnl/issues/152) — **Calendar subscription feed (iCalendar / `.ics`).** p7l already owns the schedule machinery — surface it as a read-only iCal feed users can subscribe to in Apple Calendar / Google Calendar / Outlook. One per-user secret URL, events for upcoming waterings (and later: propagation milestones — see v2). Spec-light: serve `text/calendar` from `/api/calendar/<token>.ics`, regenerate on read, no two-way sync. Likely a single small wave.

## Post-v1 (v2 backlog)

- [#127](https://github.com/tsipotU/plnt-trmnl/issues/127) — Calendar view (week/month/year grid).
- [#128](https://github.com/tsipotU/plnt-trmnl/issues/128) — "Identify my plant" guided walkthrough.
- [#153](https://github.com/tsipotU/plnt-trmnl/issues/153) — **Propagation guides + calendar-backed propagation projects.** Expand the catalog with per-species *propagation profiles* (multiple methods possible per species: seed, cutting, division, layering, air-layering, grafting), and let users start a "propagation project" that p7l walks them through phase-by-phase using the existing schedule/calendar machinery. Per profile: method, difficulty (with comparator examples — apple/avocado/tomato are all "hard" but for different reasons), expected success rate, time-to-viable-plant, seasonal window, source-plant prerequisites, materials list (incl. final pot + soil + fertilizer), step-by-step process, what success looks like, common failure modes & what to watch for. Frontend: "Propagate" CTA on species/plant page → active project surface alongside the watering calendar. On success, the new plant becomes its own p7l entry and inherits the standard schedule. Catalog/freetext model mirrors the species catalog (curated for common, AI-enrichment fallback). Sizable — full design wave when picked up. Pairs with the v1.1 calendar-feed item (propagation milestones become subscribable events).
- **Multi-user / family accounts.** If p7l ever gets shared use, swap single-tenant for proper users + per-plant ownership/visibility. Builds on the v1.1 auth modernization.

These are good ideas but not v1-blocking. Land them post-flip when there's external interest.

## Deferred / out-of-band

- **Native Dutch-name audit** of the 444-plant catalog (Emiel) — pre-public-flip task. Folded into Wave 16.
- **Dog-food activity log** — short-form notes during the dog-food window, gathered into Wave 12's triage (now done).
