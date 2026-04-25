# Roadmap

Forward-looking plan for plant-trmnl. **Each wave below is a placeholder — design and implementation plans get written when we pick the wave up.** This file is the index, not the spec.

For shipped work, see [`CHANGELOG.md`](CHANGELOG.md). For the current snapshot, see [`docs/HANDOFF.md`](docs/HANDOFF.md).

---

## Status

- **Waves 1–10 shipped.** Catalog at 250 species across 12 categories. Pull-based enrichment API live. Auth gate, ErrorBoundary, plant-image plumbing (monstera fixture), AddPlant onboarding polish all in. Repo is private; v1.0.0 not yet tagged. See `CHANGELOG.md`.
- **Now:** continued dog-food + Wave 12 prep.
- **Wave 11 deferred** — pipeline design landed but generation source not chosen. See [#138](https://github.com/tsipotU/plant-trmnl/issues/138). Lives at the bottom of this doc.
- **Next active waves:** 12 → 13 → 14, in order. Order is deliberate — each wave teaches us something the next one needs.

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

## Wave 13 — Design + identity

**Goal:** Plant-trmnl gets its own visual identity, not the generic "AI built this" look.

**Brainstorm topics:**
- Color palette beyond DaisyUI defaults — something quiet, indoor-plant-coded, mostly monochrome with one accent.
- Typography choices.
- Logo treatment beyond the 🪴 emoji (or a deliberate decision to keep the emoji).
- Empty states, micro-interactions, "feel" of the app.
- TRMNL screen visual redesign matched to the new identity (issue #7).
- Mobile dashboard polish (issue #40, holistic frontend pass).
- Calibration UX (issue #60: explanation, progress, convergence celebration, drift detection).

**Likely outputs:** Design exploration in something other than code first (Figma / mockups / mood board), then `docs/plans/<date>-wave-13-identity-{design,plan}.md`, then implementation under one squash-merge.

Closes issues #7, #40, #60. May spawn additional issues for follow-up.

## Wave 14 — Final pre-release wave

**Goal:** Everything that has to be true on the day we flip the repo public.

**Already in place** (landed during the post-Wave-8 cleanup pass — verify they're still accurate at flip time):
- `LICENSE` (MIT), `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CODEOWNERS`.
- `.github/ISSUE_TEMPLATE/{bug,feature}.md`, `.github/pull_request_template.md`.
- `.github/workflows/test.yml` (CI), `.github/dependabot.yml`.
- `.nvmrc`, `.editorconfig`.
- `scripts/pre-flip-audit.sh`, `scripts/audit-issues.sh`, `scripts/filter-repo-replacements.txt`.

**Brainstorm topics:**
- Run `scripts/pre-flip-audit.sh` — should fail on first run (history contains personal paths). That triggers the next step.
- Run `git filter-repo --replace-text scripts/filter-repo-replacements.txt`. Re-run the audit; expect exit 0. Force-push.
- Run `scripts/audit-issues.sh`; edit any flagged GitHub issues.
- README final pass — every link works, every screenshot reflects shipping reality, every command in `INSTALL.md` runs on a clean machine.
- Native Dutch-name audit pass on the 250-plant catalog (Emiel) — soft pre-flip dependency.
- CI dry-run on a fork — make sure `.github/workflows/test.yml` actually goes green on a clean machine before contributors hit it.
- Repo settings → Visibility → public.
- Tag v1.0.0, draft GitHub Release notes from CHANGELOG `[Unreleased]` → `[1.0.0]`.
- Announce: TRMNL Discord, TRMNL forum, /r/houseplants, /r/selfhosted, HN.

**Likely outputs:** `docs/plans/<date>-wave-14-release-{design,plan}.md`, v1.0.0 tag, public repo, release notes, announcement.

---

## Deferred / out-of-band

These don't have an active timeline but are worth tracking:

- **Native Dutch-name audit** of the 250-plant catalog (Emiel) — pre-public-flip task. Soft dependency for Wave 14.
- **TRMNL-X dual-resolution support** ([#55](https://github.com/tsipotU/plant-trmnl/issues/55)) — likely closed as won't-do unless a TRMNL-X owner asks. Pairs with the Wave 11 image pipeline below.
- **Dog-food activity log** — short-form notes during the dog-food window, gathered into Wave 12's triage.

### Wave 11 (deferred) — Two-variant illustration pipeline

**Status:** Design landed 2026-04-26. Held until generation source is chosen. Tracking issue: [#138](https://github.com/tsipotU/plant-trmnl/issues/138). (Supersedes the original [#54](https://github.com/tsipotU/plant-trmnl/issues/54), now closed.)

**Goal:** Each plant gets two committed dithered PNGs — `<slug>.trmnl-x.png` (1872×1404, 16-grey, also web hero) and `<slug>.trmnl-og.png` (800×480, 4-grey) — generated by a build-time Node script using `sharp`.

**Confirmed device specs:**
- TRMNL OG: 800 × 480 px, 4 grayscale levels, 5:3 aspect
- TRMNL X: 1872 × 1404 px, 16 grayscale levels, 4:3 aspect

**Locked design decisions:**
1. Two committed variants per species (X doubles as web hero)
2. Source files NOT committed (`source-images/` is gitignored)
3. Convention-based catalog wiring (no `image_path` field; presence on disk = source of truth)
4. Build-time dithering via `packages/api/scripts/process-illustration.ts`
5. One source per TRMNL variant — generator produces two compositions per species, deliberately framed for each aspect ratio
6. Single `/api/illustrations/<filename>.png` endpoint (already exists), centralized URL helper for `slug → variant filename`

**Working style targets** (revisable when generator is picked):
- Botanical line art (black ink on white)
- Botanical line art + cross-hatch / stipple shading

**Deferred decisions** (block implementation):
- Generation source — paid API (Replicate / Fal / Stability) vs self-hosted (Apple-Silicon SDXL/FLUX) vs LLM-generated SVG vs hand-commissioned
- Free-text plant images (depends on generator viability for on-demand)
- Cost ceiling per species
- Manual override / regenerate UX
- Per-species crop offsets (likely unnecessary if Decision 5 holds)

**Likely outputs when picked up:** `docs/plans/<date>-wave-11-illustrations-{design,plan}.md`, the `process-illustration` script, two committed monstera variants, catalog loader update, URL helper, PlantDetail + renderer wiring.

Closes [#138](https://github.com/tsipotU/plant-trmnl/issues/138) (and supersedes the closed [#54](https://github.com/tsipotU/plant-trmnl/issues/54)).
