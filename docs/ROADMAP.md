# Plant TRMNL — Roadmap

Forward-looking work, organized by "wave" (a cohesive batch of related issues shipped together). Waves 1-3 are complete; see commit history and closed issues for what landed.

Issues live at [github.com/tsipotU/plant-trmnl/issues](https://github.com/tsipotU/plant-trmnl/issues). This document tracks **intent**; the issues themselves carry the acceptance criteria and the final word on scope.

## Wave 4 — Timeline polish, visuals, E2E (next)

- **[#5](https://github.com/tsipotU/plant-trmnl/issues/5) Botanical illustration pipeline per species** — visual polish for TRMNL cards
- **[#9](https://github.com/tsipotU/plant-trmnl/issues/9) End-to-end watering lifecycle validation** — integration smoke tests including Wave 2/3 features
- **[#16](https://github.com/tsipotU/plant-trmnl/issues/16) Watering history & plant health timeline (UI)** — API shipped in #20; UI missing
- **[#32](https://github.com/tsipotU/plant-trmnl/issues/32) Notes: timestamped log** — replaces single-textarea notes with a `plant_notes` table
- **[#33](https://github.com/tsipotU/plant-trmnl/issues/33) Archived plants view** — read-only listing of archived plants
- **[#34](https://github.com/tsipotU/plant-trmnl/issues/34) Condition remediation** — track resolution; pairs with the deferred #28 Flag-Condition flow
- **[#35](https://github.com/tsipotU/plant-trmnl/issues/35) Plant origin story** — purchase/gift/seedling tracking

## Wave 5 — Catalog + intelligence

- **[#1](https://github.com/tsipotU/plant-trmnl/issues/1) Plant catalog** — 250+ houseplant database with searchable dropdown (blocks #2, #3, #4, #5, #37, #39)
- **[#2](https://github.com/tsipotU/plant-trmnl/issues/2) Streamlined add-plant flow** — dropdown-first with free-text fallback
- **[#3](https://github.com/tsipotU/plant-trmnl/issues/3) Rich care profiles** — light, placement, top 15 conditions per species
- **[#4](https://github.com/tsipotU/plant-trmnl/issues/4) Plant-specific fact generation on add** — 25 LLM-generated facts per new species (pairs with #38)
- **[#36](https://github.com/tsipotU/plant-trmnl/issues/36) Dry-soil-aware calibration** — algorithm rethink; may defer to Wave 6
- **[#37](https://github.com/tsipotU/plant-trmnl/issues/37) Deep plant info on detail page** — names, origin, lore
- **[#38](https://github.com/tsipotU/plant-trmnl/issues/38) Plant facts: daily rotation on TRMNL** — mark-as-shown tracking, reset when pool empties, TRMNL-only surface
- **[#39](https://github.com/tsipotU/plant-trmnl/issues/39) Enrichment fallback** — did-you-mean suggestions when species unknown

## Wave 6 — Design + deferred

- **[#7](https://github.com/tsipotU/plant-trmnl/issues/7) TRMNL template visual redesign** — match Lovable mockups
- **[#18](https://github.com/tsipotU/plant-trmnl/issues/18) Auto-detect conditions from calibration patterns**
- **[#40](https://github.com/tsipotU/plant-trmnl/issues/40) Frontend design pass** — holistic web client UI refresh

## Wave 3 follow-ups (captured during review, to be slotted)

Non-blocking items surfaced during per-PR quality reviews. None are on the critical path; pick them up when they're the cheapest open work.

1. Surface errors in `useWeekSchedule` instead of silent empty state
2. Collapse vacation-end congestion-event bursts into a summary event
3. Parallelize `CalibrationSequence` question fetch with `Promise.all`
4. Type `getEventsForPlant` return value (remove `any[]`)
5. Bin-pack the initial schedule on `POST /api/plants` (currently waits for enrichment)
6. Drop `AddPlant`'s implicit 20cm pot-size default when no size picked

## Open design questions

- **Calibration rewrite (#36) vs. catalog (#1) ordering.** #36 is the most disruptive change in Wave 5. Current working assumption: ship it last, or isolate on a branch.

## Community-release track (parallel to feature waves)

Plant TRMNL will be published publicly for TRMNL community self-hosting. This is a parallel track to the feature waves — it does not block Wave 4 or Wave 5 and is not a prerequisite for any wave.

### Blocking architectural decisions (must answer BEFORE Release Infra starts)

These are the hard design questions that shape what gets built:

#### D1 — Enrichment provider model

Current enrichment uses `@anthropic-ai/claude-agent-sdk` against Emiel's Claude Max subscription — works for dev but NOT for other users. Options under consideration:

- **A. Catalog-only.** Ship a ~250-plant JSON catalog in the repo. No LLM calls anywhere. Users get care data for common species instantly; rare species get a graceful "add your own care notes" fallback.
- **B. User-supplied Anthropic API key.** `ANTHROPIC_API_KEY` env var. If set, LLM enrichment is enabled; otherwise skipped. Cost: ~$0.01/plant, user-borne.
- **D. Hybrid A+B (recommended).** Ship catalog; Claude fallback only if the user opted in AND the species isn't in the catalog. Maps cleanly to Wave 5's existing issues #1 (catalog) and #4 (fact/care generation).

**Decision needed before:** Wave 5 planning. This directly shapes issues #1, #3, #4, #37, #39.

#### D2 — Image/card art strategy

Users will want species-specific visuals on the TRMNL card. Options:

- **Ship illustrations in repo.** Curated PNG/SVG set keyed by species slug. Generic fallback icon when no match. Contributors submit new art via PR. Lines up with issue #5.
- **User-supplied image API key.** Replicate/Ideogram/DALL-E at plant-add time.
- **No illustrations for v1.0.** Text-only cards; illustrations defer to v1.1+.

**Recommendation:** ship illustrations in repo + generic fallback. Skip per-install image generation.

**Decision needed before:** release infra starts, since build pipeline needs to know if there are large binary assets.

#### D3 — Keys UX

TRMNL device API key and plugin UUID need to be configured per install. Options:

- **.env file + INSTALL.md walkthrough.** Industry standard for self-hosted tools. Users edit `.env` once; restart containers. Recommended for v1.0.
- **First-run in-app wizard.** Slicker UX, but adds ~3-5× work (DB encryption, session auth, bootstrap flow). Defer to v1.1+ unless users ask.

**Decision: .env + INSTALL.md for v1.0.**

#### D4 — Settings boundary

Which parameters MUST be env-driven (vs hardcoded, vs DB-stored)? Today: heating-season dates, TRMNL creds, Claude config. Need an explicit list of "public-release-configurable" settings and verify each flows through `.env`. Informed by the hardcoded-secrets audit (run 2026-04-23).

### Release Infra — packaging + CI/CD

**Goal:** ship pre-built multi-arch Docker images on GitHub Container Registry so TRMNL community users can self-host with `docker compose up -d` — no build time on Pi, works on any Linux host (arm64 or amd64).

**Prerequisites (must be true before this work starts):**
1. Hardcoded-secrets audit clean (run + addressed any findings)
2. D1 (enrichment) and D2 (images) decided and implemented or scoped
3. D4 settings-boundary list finalized — every knob lives in `.env`
4. `.env.example` is complete and safe to publish
5. Git history clean — verify `.env` / secrets never committed, or plan history rewrite

**Scope of Release Infra work:**

1. **`.github/workflows/release.yml`** — GitHub Actions workflow triggered on `v*` tag push
   - Builds multi-arch images (`linux/amd64` + `linux/arm64`) via `docker/build-push-action`
   - Separate jobs for `plant-api` and `plant-renderer` containers
   - Pushes to `ghcr.io/tsipotU/plant-trmnl-api:v0.X.Y` + `:latest`
   - Uses `docker/setup-qemu-action` for cross-arch emulation

2. **`.github/workflows/test.yml`** — on every PR + push to main
   - Run API test suite
   - Run client test suite
   - Run client build (tsc check)
   - Optionally: lint, typecheck, basic Docker build smoke test
   - Ensures contributions don't break main

3. **`docker-compose.yml` — two-file split**
   - `docker-compose.yml` → uses `image: ghcr.io/tsipotU/plant-trmnl-api:latest` (end users)
   - `docker-compose.dev.yml` → override that replaces `image:` with `build:` (local dev)
   - Both committed; users pick based on their workflow

4. **`INSTALL.md` — full walkthrough**
   - Prerequisites: Docker, Docker Compose, a TRMNL device with Developer Edition enabled
   - Step 1: Create TRMNL plugin (with screenshots of the TRMNL dashboard UI)
   - Step 2: Copy plugin UUID and device API key
   - Step 3: Download `docker-compose.yml` + `.env.example`
   - Step 4: Edit `.env` with keys
   - Step 5: Paste Liquid template into TRMNL plugin Markup editor (Full view tab) — critical gotcha, not auto-deployed
   - Step 6: `docker compose up -d`
   - Step 7: Add first plant, watch TRMNL push update
   - Upgrade path: `docker compose pull && docker compose up -d`
   - Backup/restore: SQLite file location, `sqlite3 .backup`, migration notes

5. **`CONTRIBUTING.md` — one-page contributor guide**
   - How to fork, branch, test, open a PR
   - Conventional Commits hint (matches current commit style)
   - Tests expected for new features
   - Code review expectations (best-effort, solo maintainer)
   - Where to ask questions (GitHub Discussions or Issues)

6. **`LICENSE` — MIT license file**
   - Standard MIT text with year + `tsipotU` as copyright holder
   - Placement: repo root

7. **`.github/ISSUE_TEMPLATE/` — Issue templates**
   - `bug_report.yml` — prompts for version, OS, steps to reproduce, expected vs actual
   - `feature_request.yml` — prompts for motivation, proposed solution, alternatives
   - `question.yml` → points to GitHub Discussions instead of Issues (keeps noise down)

8. **`README.md` — rework for public release**
   - Top: short tagline + screenshot/GIF
   - Install section (points to INSTALL.md)
   - Features (already done)
   - Architecture (already done — keep Mermaid diagram)
   - Roadmap pointer (already done)
   - Contributing pointer
   - License pointer
   - Badges: build status, latest release, Docker image version, license

9. **Repo settings tuning**
   - Enable Dependabot (free CVE scanning on deps)
   - Enable GitHub security advisories
   - Branch protection on `main`: require PR, require passing CI, disallow force-push
   - Enable GitHub Discussions (for "how do I…" questions)

**Estimated effort:** 1 day of focused work once prerequisites are met.

**Impact on ongoing development:**
- Day-to-day dev unchanged (branch, PR, merge, tag release)
- Release cadence: tag after each wave merges
- Small overhead: CI must pass before merge (adds 2-5 min per PR)
- Dependabot will open PRs for dep bumps — merge or close as appropriate

### v1.0.0 Public Release

**Goal:** First tagged public release, announcement to TRMNL community.

**Prerequisites:**
1. Release Infra complete (Docker images build + publish on tag push)
2. Wave 5 merged (catalog + intelligence — so new users get real care data)
3. Fresh-install smoke test passed on:
   - Raspberry Pi 4 or 5 (arm64)
   - Linux x86_64 server (amd64)
   - Synology NAS or equivalent (optional but common in community)
4. LICENSE, INSTALL.md, CONTRIBUTING.md, issue templates all in place
5. D1/D2/D3/D4 decisions all implemented

**Scope of release work:**

1. **Regression pass.** Run the test suite. Spin up a fresh install on a clean Pi. Add 3-5 plants. Water them. Verify TRMNL push works end-to-end. Verify calendar strip, batch water, overflow rebalance, memorial toasts all function as expected.

2. **Tag v1.0.0.** `git tag v1.0.0 -a -m "..."` → push tag → GitHub Actions publishes images.

3. **Release notes.** Write an announcement covering:
   - What Plant TRMNL is
   - Who it's for
   - Install link (points to INSTALL.md + Docker Compose quickstart)
   - Feature overview (pull from README Features section)
   - What's NOT included (Windows/macOS native, hosted SaaS version)
   - Known limitations
   - Roadmap teaser (wave 6+ in the backlog)

4. **Community announcement.**
   - TRMNL Discord / forum (wherever community lives)
   - Reddit r/selfhosted (maybe)
   - Personal social channels if desired
   - Keep announcement modest — "hobby project, best-effort support, PRs welcome"

5. **Expectations management.** Add to README: *"Plant TRMNL is a hobby project maintained in spare time. Issues and PRs welcome — response times are best-effort (days to weeks, not hours)."* This is honest and sets the tone.

6. **Post-release monitoring (first 2 weeks).**
   - Watch issue tracker for install problems
   - Fix any Show-stoppers with a patch release (v1.0.1)
   - Collect feedback for v1.1

**Estimated effort:** half a day for the release itself, plus 1-2 days of support over the following 2 weeks.

### Audit findings (2026-04-23)

Haiku audit run 2026-04-23 found the repo is mostly ready — no secrets in git history, `.env` correctly gitignored, config properly env-driven, dockerfiles clean, no hardcoded LAN IPs or personal emails in source code. Three real items to address before public release:

**A. Hygiene action (not a blocker, but do before public release):**
- Rotate your TRMNL API key + plugin UUID in the TRMNL dashboard. Your current values live in `.env` only (never committed to git, so not leaked), but rotating once before going public is defensive hygiene in case the file ever gets copied off your machine.

**B. Personal paths to clean (blocker):**
- `docs/specs/2026-04-07-plant-trmnl-design.md` lines 223-224, 238-239, 640-643 — references to `[redacted-path]/Downloads/trmnl-1-plant-BjV-4oWY.png`. Either relocate referenced images to `docs/mockups/` (some already exist there), or update the paths to be relative/sanitized.
- `docs/plans/2026-04-07-plant-trmnl-plan.md` lines 108, 112, 116 — references to `[redacted-path]/Projects/[private-repo]/.agents/goals/build-app.md`. Rewrite as "adapt the ATLAS workflow from a related project" without the absolute path. `[private-repo]` is a private repo; its existence doesn't need to surface in a public doc.

**C. Docker Compose portability (blocker):**
- `docker-compose.yml` line 13 uses `${HOME}/Backups/plant-trmnl:/backups`. For public distribution, change to `./backups:/backups` and document in INSTALL.md that users need to create a `backups/` directory (or have the compose file create it via a named volume).

**D. Discovery — n8n IS in the enrichment path:**
- `.env.example` declares `N8N_ENRICHMENT_WEBHOOK_URL`. There's an n8n-based enrichment webhook wired alongside the Claude Agent SDK path. This matters for the D1 decision (enrichment provider model) — the n8n workflow points to a personal n8n instance and won't work for other users. Decisions:
  - Option α: rip out the n8n path entirely, use only the Claude Agent SDK path (plus D1's Catalog + user-key hybrid).
  - Option β: keep n8n as an optional power-user path; document how to configure their own n8n instance.
  - Option γ: treat n8n as deprecated, leave the code but don't surface in INSTALL.md.
  - **Recommendation: α — rip out.** Simplifies the architecture, eliminates a dependency on an external service, and the Claude Agent SDK path is already primary.

### Community-release prerequisites tracking

Status checklist — update as items land:

- [x] Hardcoded-secrets audit complete (2026-04-23)
- [ ] Blocker B: clean personal paths in docs/specs/ and docs/plans/ (Wave 4 spec task)
- [ ] Blocker C: make docker-compose.yml backup mount portable (Wave 4)
- [ ] Hygiene A: rotate TRMNL keys (anytime before first public tag)
- [ ] D1 enrichment decision — including whether to rip out n8n per audit finding D
- [ ] Audit findings addressed (Wave 4 target)
- [ ] D1 enrichment decision made + implemented (likely Wave 5 via issues #1, #4)
- [ ] D2 image decision made (scope for Wave 5 or v1.0 prep)
- [ ] D4 settings-boundary list finalized (part of audit response)
- [ ] Release Infra work complete (LICENSE, CONTRIBUTING, INSTALL, CI, issue templates, etc.)
- [ ] Wave 5 merged
- [ ] Fresh-install smoke test passed on Pi + Linux server
- [ ] v1.0.0 tagged + released + announced

## Shipping history (brief)

- **Wave 1** (shipped): core build, DB + API + renderer + TRMNL push pipeline, enrichment, plant identifiers (#10), feedback system (#19)
- **Wave 2** (shipped 2026-04-22): paginated events endpoint (#20), archive with reason + memorial (#17/#21), undo-water (#14/#22), seasonal modifier (#15/#23), welcome empty state (#13/#24)
- **Wave 3** (shipped 2026-04-22 → 2026-04-23): 11 PRs — multi-plant overflow/rebalance (#6), batch watering (#11), 7-day calendar strip (#12), pot size categories (#31), memorial toast variants (#30), archive dialog polish (#29), reason-specific timeline hides (#25), hide Flag Condition (#28), button copy (#27), 15s undo (#26), client-side vitest infrastructure
