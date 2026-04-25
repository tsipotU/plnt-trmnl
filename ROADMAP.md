# Roadmap

Forward-looking plan for plant-trmnl. **Each wave below is a placeholder — design and implementation plans get written when we pick the wave up.** This file is the index, not the spec.

For shipped work, see [`CHANGELOG.md`](CHANGELOG.md). For the current snapshot, see [`docs/HANDOFF.md`](docs/HANDOFF.md).

---

## Status

- **Waves 1–10 + 12 shipped.** Catalog at 250 species across 12 categories. Pull-based enrichment API live. Auth gate, ErrorBoundary, plant-image plumbing (monstera fixture), AddPlant onboarding polish, date-strip rework, memorial page redesign all in. Repo is private; v1.0.0 not yet tagged. See `CHANGELOG.md`.
- **Now:** Wave 13 — plant detail structural rework (#134 epic + #133 + #60).
- **Wave 11 deferred → re-bundled into Wave 14** — pipeline design landed (#138) but generation source not chosen. Picking up tomorrow alongside #7 (TRMNL template).
- **Next active waves:** 13 → 14 → 15 → 16, in order. v1.0 ships at end of Wave 16.

## Wave 9 — Hardening

**Goal:** Make the app behave like a professional product when something goes wrong, not a research prototype.

**Why this is first.** The blank-screen incident on 2026-04-25 (`/api/calibration/due` returning a plant without its `question` field, no error boundary, whole React tree unmounted) made it clear: a community installer wouldn't know how to recover. Fix the class of problem, not just the instance.

**Brainstorm topics for the design pass:**
- Top-level React `ErrorBoundary` so a crash on one route doesn't blank the whole app.
- Server contract guards: every route returns the shape the client expects, or a typed error envelope; no silent shape drift.
- "Healthy on boot" startup checks: catalog loads, DB schema migrates, env validates, TRMNL keys reachable. Print a one-screen startup banner with pass/fail.
- A user-facing `/about` or `/diagnostics` page that surfaces version, DB row counts, last cron run, last enrichment activity, last TRMNL push — so a non-technical user can answer "is it working?" without grepping logs.
- Container restart policies + clear logs when the API crashes.
- Optional auth on enrichment endpoints (the long-standing v1.1 limitation in `INSTALL.md`).

**Likely outputs:** `docs/plans/<date>-wave-9-hardening-{design,plan}.md`, ErrorBoundary + diagnostics page, startup banner, contract tests on critical routes.

## Wave 10 — Onboarding flow

**Goal:** First-time users see a guided setup, not an empty dashboard.

**Brainstorm topics:**
- Empty-state detection: zero plants AND no `TRMNL_API_KEY` set → onboarding screen, not dashboard.
- Step-by-step flow: TRMNL keys (API key + plugin UUID) → connect-your-AI prompt copy → add-first-plant → confirm screen.
- Skippable but resumable — user can come back to it from Settings.
- Help inline for "what is this key, where do I find it" without making the user leave the app.
- Add-first-plant supports both AI-enrichment-pending AND fully-manual paths (some users won't connect an AI at all).

**Likely outputs:** `docs/plans/<date>-wave-10-onboarding-{design,plan}.md`, an `/onboarding` route, gating logic in App.tsx, copy for each step.

## Wave 11 — DEFERRED — Image generation pipeline

Design landed 2026-04-26 — see **[#138](https://github.com/tsipotU/plant-trmnl/issues/138)** for the full spec (two-variant-per-species, convention-based catalog wiring, build-time dithering script, generator-agnostic). Held until a generation source is chosen (paid API vs self-hosted vs LLM-SVG vs hand-commissioned). Until then the existing monstera placeholder serves PlantDetail; nothing blocks downstream waves.

Detailed write-up moved to the bottom of this file under [Deferred / out-of-band](#deferred--out-of-band).

## Wave 12 — Polish & feedback

**Status:** Design landed 2026-04-26 — see [`docs/specs/2026-04-26-wave-12-polish-design.md`](docs/specs/2026-04-26-wave-12-polish-design.md).

**Scope:** Two issues, bundled in one squash-merge PR.

- [#126](https://github.com/tsipotU/plant-trmnl/issues/126) — date strip: distinguish today from selected, ±5-day centered scroll
- [#135](https://github.com/tsipotU/plant-trmnl/issues/135) — archive flow: post-archive nav fix + memorial page (full redesign, both halves bundled because the bug fix needs the new page to land on)

**Explicitly out of scope:** #133 (overlaps Wave 13's design pass), #59 PWA (new capability, not polish), #18 auto-detect (new feature).

**Likely outputs:** `docs/plans/<date>-wave-12-plan.md`, the implementation under one squash-merge PR.

## Wave 13 — Plant detail structural rework

**Status:** In flight 2026-04-26. Spec landing in `docs/specs/2026-04-26-wave-13-plant-detail-design.md`.

**Scope:**
- [#134](https://github.com/tsipotU/plant-trmnl/issues/134) — **Epic:** Plant passport information architecture. Reframe the plant detail page as five conceptual layers (database knowledge → care defaults → this-specific-plant facts → schedule → history). Output: design doc + child issues filed + foundational implementation (image hero + section ordering).
- [#133](https://github.com/tsipotU/plant-trmnl/issues/133) — Common conditions UI redesign. Identical-height collapsible cards with severity icons; tap to expand Remedy + Prevention. Multiple cards expandable simultaneously, expand state in URL.
- [#60](https://github.com/tsipotU/plant-trmnl/issues/60) — Calibration UX. Four pieces: explanation tooltip, progress indicator (`N of ~M`), convergence celebration (toast + dialed-in badge), drift detection (un-converge on sustained answer shift).

**Explicitly out of scope:** Visual identity work (palette, typography, logo) — those land in Wave 16's pre-flip polish, not here. Wave 13 stays within the existing visual language.

**Likely outputs:** `docs/plans/2026-04-26-wave-13-plan.md`, the implementation under one squash-merge PR (or split if scope demands), 3–4 new child issues filed under #134.

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
- Native Dutch-name audit on the 250-plant catalog (Emiel).
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

## Post-v1 (v2 backlog)

- [#127](https://github.com/tsipotU/plant-trmnl/issues/127) — Calendar view (week/month/year grid).
- [#128](https://github.com/tsipotU/plant-trmnl/issues/128) — "Identify my plant" guided walkthrough.

These are good ideas but not v1-blocking. Land them post-flip when there's external interest.

## Deferred / out-of-band

- **Native Dutch-name audit** of the 250-plant catalog (Emiel) — pre-public-flip task. Folded into Wave 16.
- **Dog-food activity log** — short-form notes during the dog-food window, gathered into Wave 12's triage (now done).
