# Roadmap

Forward-looking plan for plant-trmnl. **Each wave below is a placeholder — design and implementation plans get written when we pick the wave up.** This file is the index, not the spec.

For shipped work, see [`CHANGELOG.md`](CHANGELOG.md). For the current snapshot, see [`docs/HANDOFF.md`](docs/HANDOFF.md).

---

## Status

- **Waves 1–10 + 12 + 13 shipped.** Catalog at 444 species across 12 categories (expanded from 250 on 2026-04-26). Pull-based enrichment API live. Auth gate, ErrorBoundary, plant-image plumbing (monstera fixture), AddPlant onboarding polish, date-strip rework, memorial page redesign, plant-detail passport-IA scaffolding (CollapsibleSection, ConditionCard primitives), calibration UX (explanation, progress, convergence/drift) all in. Repo is private; v1.0.0 not yet tagged. See `CHANGELOG.md`.
- **Now:** Wave 14 (next session) — TRMNL identity (#7 template + #138 illustrations). Generation source for #138 must be chosen before that part can ship.
- **Next active waves:** 14 → 15 → 16, in order. v1.0 ships at end of Wave 16.
- **Open child issues from Wave 13** (filed for future waves): [#139](https://github.com/tsipotU/plant-trmnl/issues/139) full passport-order section reorder, [#140](https://github.com/tsipotU/plant-trmnl/issues/140) hero block redesign, [#141](https://github.com/tsipotU/plant-trmnl/issues/141) "this plant" consolidation, [#142](https://github.com/tsipotU/plant-trmnl/issues/142) sticky in-page nav, [#143](https://github.com/tsipotU/plant-trmnl/issues/143) origin & lore narrative card.

## Shipped waves (1–10 + 12 + 13)

For each shipped wave's full scope and outcome, see [`CHANGELOG.md`](CHANGELOG.md). Specs and plans live under [`docs/specs/`](docs/specs/) and [`docs/plans/`](docs/plans/) (current waves) and [`docs/archive/`](docs/archive/) (Waves 1–8). Wave 11 was deferred and re-bundled into Wave 14 below.

## Wave 14 — TRMNL identity (template + illustrations)

**Status:** Picked up tomorrow (2026-04-27).

**Scope:**
- [#7](https://github.com/tsipotU/plant-trmnl/issues/7) — TRMNL template visual redesign matching Lovable mockups. Liquid templates for watering-day-1, watering-day-2, rest-day; title bar + footer; typography hierarchy; calibration prompt with 1–5 scale visual. Touches `docs/trmnl-templates/` only — separate from the SPA.
- [#138](https://github.com/tsipotU/plant-trmnl/issues/138) — **Two-variant illustration pipeline** (formerly Wave 11). Generation source must be chosen before this can ship. Build-time dithering script (`packages/api/scripts/process-illustration.ts`) using `sharp`, two committed PNGs per species (`<slug>.trmnl-x.png` 1872×1404 16-grey + `<slug>.trmnl-og.png` 800×480 4-grey), convention-based catalog wiring. Generator-agnostic.

**Likely outputs:** Liquid templates committed in `docs/trmnl-templates/`, `process-illustration.ts` script, two committed monstera variants as proof-of-pipeline, catalog loader update, SPA + renderer URL helper.

## Wave 15 — Capabilities for v1 (PWA + TRMNL-X)

**Scope:**
- [#59](https://github.com/tsipotU/plant-trmnl/issues/59) — PWA: installable home-screen app, service worker for asset cache, web manifest with 🪴 icon, install prompt, offline indicator. Required for v1 mobile feel.
- [#55](https://github.com/tsipotU/plant-trmnl/issues/55) — TRMNL-X dual-resolution support. Renderer produces two images at different resolutions; push cron decides which to serve based on device-type query param. Pairs with Wave 14's illustration pipeline (which already produces both variants per species).

**Likely outputs:** `docs/plans/<date>-wave-15-plan.md`, `manifest.webmanifest`, service worker, renderer dual-output mode, push-cron device-type routing.

## Wave 16 — Pre-flip polish + release

**Goal:** Everything that has to be true on the day we flip the repo public, including the holistic visual pass.

**Scope:**
- [#40](https://github.com/tsipotU/plant-trmnl/issues/40) — Holistic frontend design pass. The *last* thing before flip. By now the IA (Wave 13), TRMNL identity (Wave 14), and capabilities (Wave 15) are all in place. This pass unifies palette/typography/spacing across the SPA, polishes empty states and micro-interactions, defines the visual identity that the previous waves used in placeholder form. Visual only, no functional changes.
- Native Dutch-name audit on the 444-plant catalog (Emiel).
- Run `scripts/pre-flip-audit.sh` — should fail on first run (history contains personal paths).
- Run `git filter-repo --replace-text scripts/filter-repo-replacements.txt`. Re-run audit; expect exit 0. Force-push.
- Run `scripts/audit-issues.sh`; edit any flagged GitHub issues.
- README final pass — every link works, every screenshot reflects shipping reality, every command in `INSTALL.md` runs on a clean machine.
- CI dry-run on a fork — make sure `.github/workflows/test.yml` actually goes green on a clean machine.
- Repo settings → Visibility → public.
- Tag v1.0.0, draft GitHub Release notes from CHANGELOG `[Unreleased]` → `[1.0.0]`.
- Announce: TRMNL Discord, TRMNL forum, /r/houseplants, /r/selfhosted, HN.

**Already in place** (landed during the post-Wave-8 cleanup pass — verify at flip time):
- `LICENSE` (MIT), `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CODEOWNERS`.
- `.github/ISSUE_TEMPLATE/{bug,feature}.md`, `.github/pull_request_template.md`.
- `.github/workflows/test.yml` (CI), `.github/dependabot.yml`.
- `.nvmrc`, `.editorconfig`.
- `scripts/pre-flip-audit.sh`, `scripts/audit-issues.sh`, `scripts/filter-repo-replacements.txt`.

**Likely outputs:** `docs/plans/<date>-wave-16-plan.md`, v1.0.0 tag, public repo, release notes, announcement.

---

## Won't-fix / closed

- [#18](https://github.com/tsipotU/plant-trmnl/issues/18) — **Auto-detect conditions from calibration patterns.** Closed 2026-04-26 as not-planned. Signal-to-noise on unsupervised pattern detection from calibration answers is too low to be trusted (mixes season, location, pot size, soil mix, plant-specific drift). The calibration loop already covers the practical case implicitly. Revisit only if a future use case actually demands it.

## v1.1 backlog (post-flip, before v2)

Things that shouldn't block v1.0 but should land soon after.

- [#144](https://github.com/tsipotU/plant-trmnl/issues/144) — **Auth modernization — better-auth + passkeys + device list.** Current auth is hand-rolled bcrypt + a single global password + cookie sessions. Adequate (especially after the 2026-04-26 hotfix that scoped the gate to `/api/*` so fresh devices can reach `/login`), but lacks: per-device session visibility, "revoke iPhone" without nuking everything, passkey support (one-tap login via Face ID/Touch ID, iCloud-synced across devices), and any path to MFA later. Plan: migrate to [`better-auth`](https://www.better-auth.com/) — TypeScript-first Express-friendly library with passkeys/password/sessions/device-list out of the box, no extra container. Keeps password as fallback, keeps the bootstrap setup-token flow. Single-tenant remains (no multi-user). Estimated 1 wave (~3-5 commits).
- **Catalog illustrations rollout.** Catalog is now 444 species but only 1 has an `image_path` (monstera-deliciosa-albo-variegata). Wave 14's #138 illustration pipeline produces the variants per species; v1.1 is when we actually populate the catalog. Auto-backfill `plants.illustration_path` at boot (when a plant's species matches a catalog entry that has `image_path` and the column is NULL) so users with pre-existing plants get images for free as new illustrations land.
- **"Drift from mean" calibration model.** Wave 13 added drift detection using the existing convergence-reset logic (a non-3 answer flips `is_converged` 1→0). A richer model that tracks mean dry-days over the last N cycles and flags meaningful deviation is the proper fix.

## Post-v1 (v2 backlog)

- [#127](https://github.com/tsipotU/plant-trmnl/issues/127) — Calendar view (week/month/year grid).
- [#128](https://github.com/tsipotU/plant-trmnl/issues/128) — "Identify my plant" guided walkthrough.
- **Multi-user / family accounts.** If PLNT ever gets shared use, swap single-tenant for proper users + per-plant ownership/visibility. Builds on the v1.1 auth modernization.

These are good ideas but not v1-blocking. Land them post-flip when there's external interest.

## Deferred / out-of-band

- **Native Dutch-name audit** of the 444-plant catalog (Emiel) — pre-public-flip task. Folded into Wave 16.
- **Dog-food activity log** — short-form notes during the dog-food window, gathered into Wave 12's triage (now done).
