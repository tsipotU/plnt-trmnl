# Roadmap

Forward-looking plan for plant-trmnl. **Each wave below is a placeholder — design and implementation plans get written when we pick the wave up.** This file is the index, not the spec.

For shipped work, see [`CHANGELOG.md`](CHANGELOG.md). For the current snapshot, see [`docs/HANDOFF.md`](docs/HANDOFF.md).

---

## Status

- **Waves 1–8 shipped.** Catalog at 250 species across 12 categories. Pull-based enrichment API live. Repo is private; v1.0.0 not yet tagged. See `CHANGELOG.md`.
- **Now:** dog-food window. Use the new architecture day-to-day, find rough edges, capture them as feedback or issues.
- **Next:** Waves 9–14 below, in order. Order is deliberate — each wave teaches us something the next one needs.

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

## Wave 11 — Image generation pipeline

**Goal:** Each plant gets a recognizable, hand-drawn-looking image rendered for both TRMNL displays.

**Constraints to honor in design:**
- TRMNL OG: ~800×480, **4-color palette** (black, dark grey, light grey, white).
- TRMNL X: ~1872×1404, **16-greyscale** palette.
- "Hand-drawn-looking, recognizably this plant" — not photoreal, not AI-slop.

**Brainstorm topics:**
- Generator: SDXL/FLUX with stylization LoRAs vs. a simpler illustration model. Can we keep it offline / self-hosted, or is this a paid-API step?
- Cataloged species (250) get illustrations once; user-added free-text plants run on-demand.
- Storage and naming: keyed by catalog `slug`. CDN/origin path under `/assets/illustrations/`.
- Dithering pipeline: produce one source render → dither for OG (4-color Floyd-Steinberg or similar) and for X (16-greyscale). Output cache for both resolutions.
- Cost ceiling per plant. Manual override / regenerate button per species.

**Likely outputs:** `docs/plans/<date>-wave-11-illustrations-{design,plan}.md`, an illustration generator service or script, dithered output cache, plant detail page wiring, TRMNL template image slot.

Closes issue #54.

## Wave 12 — Bugfix + feedback wave

**Goal:** Burn down the in-app feedback table and the open GitHub issues that surfaced during the dog-food window.

**Brainstorm topics:**
- Triage what's left in the in-app feedback table (`/api/feedback` open + in-progress).
- Look at GitHub issues that accumulated post-Wave-8 dog-fooding.
- No big new features — just polish, fixes, small UX wins, accessibility.
- Maybe a small refactor rotation slot per `docs/RELEASE-PROCESS.md`.

**Likely outputs:** `docs/plans/<date>-wave-12-polish-{design,plan}.md`, a triaged list, a series of small fixes under one squash-merge PR.

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

## Out-of-band threads

These don't need their own wave but are worth tracking:

- **Native Dutch-name audit** of the 250-plant catalog (Emiel) — pre-public-flip task. Soft dependency for Wave 14.
- **TRMNL-X dual-resolution support** (issue #55) — likely closed as won't-do unless a TRMNL-X owner asks. Re-evaluate during Wave 11.
- **Dog-food activity log** — short-form notes during the dog-food window, gathered into Wave 12's triage.
