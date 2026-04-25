# Wave 8 Design — community-installable, in-process LLM removed

**Date:** 2026-04-25
**Wave:** 8
**Theme:** Community-release prep (pre-public-flip technical readiness)
**Sequencing:** Wave 8 = community-release. Wave 9 = TRMNL-X dual-resolution + template visual redesign. Wave 10 = deep features (calibration UX, auto-detect conditions).
**Issues touched:** #52 (architecture switch), #56 (Copy AI setup prompt), #57 (CHANGELOG + RELEASE-PROCESS), Blocker B (personal paths), Blocker C (backups path). Closes #58 as WONTFIX.
**Target shape:** single squash-merge PR, branch `feat/wave-8-community-release`.

## 1. Goals & non-goals

### Goals

- After Wave 8, plant-trmnl is a self-contained Node + SQLite app with **zero in-process LLM code** and **zero Anthropic-SDK dependency**.
- Anyone with any AI tool (Claude Desktop scheduled task, ChatGPT scheduled task, ChatGPT free + copy-paste, Cursor, Ollama + cron, n8n, Python script) can enrich their own plants via documented HTTP endpoints.
- A "Copy AI setup prompt" button in the Settings page gives users a one-shot prompt that teaches their AI everything it needs to keep enrichment running on a schedule.
- The repo is technically ready to flip public: no leaked paths in HEAD, INSTALL.md walks a stranger from `git clone` to working install, CHANGELOG covers the project's full history, RELEASE-PROCESS.md captures the playbook (including the `git filter-repo` recipe).

### Non-goals (explicitly out of scope for Wave 8)

- The actual public flip — repo stays private. Wave 8 ends with a "ready to publish, dog-food for one to two weeks" checkpoint.
- The `git filter-repo` history rewrite — *codified* as a step in `RELEASE-PROCESS.md`, not *executed* this wave.
- The GitHub Issues audit — same: documented in the playbook, run pre-flip.
- v1.0.0 tag — pushed at the public-flip event, not at end of Wave 8.
- Per-plant manual paste fallback (#58) — closed as WONTFIX.
- TRMNL-X dual-resolution (#55), template visual redesign (#7), illustration pipeline (#54), frontend design pass (#40) — all Wave 9.
- Catalog expansion to 250+ (#1), calibration UX (#60), auto-detect conditions (#18) — Wave 10.

## 2. Architecture: the pending-queue model

The single mental model: **plant-trmnl owns state, external AI owns enrichment.** All flows are pull-based.

### State machine

Two columns drive the model: `plants.enrichment_status` (already exists) and `conditions.care_update_status` (new).

```
enrichment_status:  pending → complete

care_update_status: not_needed → pending → complete
```

No `failed` state. If the AI can't enrich a plant, it simply doesn't POST — the row stays `pending` and the AI retries on the next loop. Surfacing failures isn't useful when the user can't do anything about them server-side; the diagnostic path is "look at the AI tool's logs, not plant-trmnl's."

Today: `enrichment_status` flips to `complete` when the in-process Claude SDK callback fires. After Wave 8: it flips to `complete` when the external AI POSTs to the new ingestion endpoint.

### New endpoints (4 total)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/plants?enrichment=pending` | List plants needing enrichment. Returns minimal payload: id, name, identifier, pot_size_cm, light_level, location, plant_size — i.e. everything the AI needs to research the species. |
| `POST` | `/api/plants/:id/enrichment` | Receive enrichment payload (latin_name, common_names, origin, lore, care, conditions, facts). Validates schema, persists, flips status to `complete`, fires the same event-log + scheduling side-effects the SDK path used to fire. |
| `GET` | `/api/conditions?care_update=pending` | List flagged conditions awaiting care suggestion. |
| `POST` | `/api/conditions/:id/care-update` | Receive care adjustment (interval delta, light hint, etc.). Persists + flips status. |

### Existing behavior preserved

- The `POST /api/enrichment/callback` endpoint stays exactly as-is. Wave 7 already made it provider-agnostic. The new `POST /api/plants/:id/enrichment` endpoint delegates to the same persistence helpers.
- `routes/lifecycle.test.ts` continues to drive the callback endpoint as a test seam (no LLM in tests, ever).

### What changes inside `routes/plants.ts` and `routes/conditions.ts`

The 4 fire-and-forget SDK calls become **no-ops**: just write `enrichment_status='pending'` (already happening) and don't fire anything. The pull-based queue picks it up.

```ts
// before
enrichPlantWithClaude(db, plantId, { ... }).catch(...)

// after
// (nothing — status is already 'pending'; external AI will pick it up)
```

Same shape inside `routes/conditions.ts` for the `updateCareForCondition` callsite, plus a new `UPDATE conditions SET care_update_status='pending' WHERE id=?` write.

### Schema migration

- Add column `conditions.care_update_status` TEXT default `'not_needed'` via the existing `addColumnIfMissing` helper.
- No data migration needed for `plants.enrichment_status` — column already exists.
- Existing plants whose enrichment was complete stay `complete`. Existing plants stuck `pending` (because SDK silently failed) become *immediately visible* in the new pending-queue endpoint — first time Claude Desktop is wired up, it'll see them and start enriching. This is the natural dog-food validation moment.

## 3. SDK removal: file-by-file

**Delete:**

- `packages/api/src/enrichment/claude-enrich.ts` (286 lines).
- `packages/api/src/enrichment/claude-enrich.test.ts` if present (verify during implementation).

**Modify (remove imports + callsites, leave everything else):**

- `packages/api/src/routes/plants.ts` — drop `import { enrichPlantWithClaude }` and the 3 `.catch(...)` blocks at lines 487, 536, 697. The plant-already-`pending` write that precedes each call stays.
- `packages/api/src/routes/conditions.ts` — drop `import { updateCareForCondition }` and the 1 callsite at line 71. Replace with a `UPDATE conditions SET care_update_status='pending' WHERE id=?` write.

**`packages/api/package.json`:**

- Remove `@anthropic-ai/claude-agent-sdk` from `dependencies`.
- `npm install` regenerates `package-lock.json` cleanly. The SDK is a leaf dep; no transitive cleanup needed.

**Config:**

- No env-var removal needed — the SDK was using OAuth from `~/.claude/`, not an env-var-driven key. Wave 7 already removed the n8n env vars.
- No new env vars added either. The new endpoints are unauthenticated for now (running on `localhost`/LAN — same trust model as today). Auth is a Wave 11+ concern when public deployments expose plant-trmnl over the open internet; documented as a known limitation in `INSTALL.md`.

**Tests that need updating:**

- Tests that mocked `enrichPlantWithClaude` (likely a few in `routes/plants.test.ts` for POST/PUT) — replace with a check that `enrichment_status='pending'` after the route returns.
- Same for `updateCareForCondition` mocks in `routes/conditions.test.ts`.
- `lifecycle.test.ts`'s `simulateEnrichment` helper continues to drive the callback endpoint — unchanged.

**New test file:**

- `packages/api/src/routes/enrichment-queue.test.ts` — covers the new endpoints: pending-list pagination, payload validation, status transition, idempotency (POSTing the same payload twice doesn't double-seed facts), error cases (bad schema, plant not found, plant not pending).

**What survives untouched:**

- `packages/api/src/enrichment/callback.ts` — Wave 7 generic-ified it. Same persistence helpers used by the new POST endpoint.
- `packages/api/src/enrichment/callback.test.ts`.
- The catalog-baseline + fact-seeding helpers (`applyCatalogBaseline`, `seedCatalogFacts`) — they run server-side regardless of who triggers enrichment.

## 4. Client UX: "Copy AI setup prompt" (#56)

### Where it lives

The Settings page (`/settings`) currently has one toggle ("Show developer info"). We add a second section above it: **"Connect your AI."**

### Anatomy of the section

- **Heading** — "Connect your AI"
- **One-line explainer** — "plant-trmnl needs help filling in care data, facts, and species info. Connect any AI tool by copying the prompt below."
- **Big primary button** — "Copy AI setup prompt"
- **What it copies** — the full setup prompt (Section 5). Includes the user's actual base URL (read from `window.location.origin`) so the prompt is ready-to-paste.
- **On click** — copy + toast "Setup prompt copied. Paste into your AI tool of choice."
- **Help links below** — "How to set this up with Claude Desktop / ChatGPT / other tools" — three named anchors that scroll to setup-recipe blocks underneath, OR open `INSTALL.md` sections in a new tab. (Decision deferred to implementation; both are cheap.)
- **Status indicator** — small read-only line: "X plants pending enrichment, Y conditions awaiting care updates." Settings polls `/api/plants?enrichment=pending` and `/api/conditions?care_update=pending` on mount.

### Why Settings (not Dashboard, not AddPlant)

- It's a one-time setup task per deployment — Settings is the canonical home for one-time setup.
- Putting it on the Dashboard would clutter the daily-use surface.
- The "X pending" indicator is also a low-key health check; Settings is the right home for it. We don't want it on the Dashboard either since pending counts during steady-state should be 0.

### What we're NOT building

- No UI to edit the prompt. The prompt is a constant string in the client; if you want to edit it you edit the source.
- No browser-side cron or "test connection" feature. The user's AI tool owns scheduling; plant-trmnl just exposes the queue.
- No inline AI tool integration ("I have Claude Desktop, do it for me"). That's exactly the dependency we're escaping.

### Tests

- Vitest in `Settings.test.tsx`: button is rendered, click triggers `navigator.clipboard.writeText` with a string containing the right base URL, toast appears.
- Pending-counts polling: mock fetch, render, assert the counts surface in DOM.

## 5. The AI setup prompt itself

This is the most consequential design artifact in the wave: the string that runs the entire community enrichment loop.

### Design principles for the prompt

1. **Literal, not aspirational.** No "be creative" or "do your best." Specify exact field names, exact JSON shape, exact length bounds.
2. **Endpoints are explicit.** Full HTTP verb + path + payload examples, not "use the API."
3. **Cadence is explicit.** "Run this every hour" / "if your tool only supports daily, that's also fine — see fallback section."
4. **Style anchors for facts.** The catalog already contains 225 facts written in a specific tone (trivia, ~100-200 chars, no "Did you know"). The prompt embeds 8-10 random sample facts as in-context style anchors. Without anchors, AI tools drift to "Did you know?" framing every time.
5. **Dedup is the AI's responsibility on its side; the server enforces on its side.** The prompt tells the AI to read existing facts via `GET /api/plants/:id/facts` before generating. The server *also* dedupes on insert (already does — Wave 5). Belt + suspenders.
6. **Multilingual is required, fallback is allowed.** The prompt requires `common_names.en[]` and `common_names.nl[]`; if the AI genuinely can't find a Dutch name, an empty array is acceptable. No fabrication.
7. **No prose responses.** "Respond by calling the POST endpoint. Do not write a summary message. Do not ask for confirmation."

### Prompt skeleton

```
You are connected to plant-trmnl, a houseplant care tracker.

Your job: keep its plant data and condition care suggestions up to date.

## How to do your job

Every hour (or every time you wake up — daily is also fine), run these two checks:

### Check 1 — pending plants
GET {{BASE_URL}}/api/plants?enrichment=pending
For each plant in the response:
  1. Research the species (using the `name` and any other context fields)
  2. Build the enrichment payload (schema below)
  3. POST {{BASE_URL}}/api/plants/{id}/enrichment with the payload

### Check 2 — pending condition care updates
GET {{BASE_URL}}/api/conditions?care_update=pending
For each condition:
  1. Read the plant context: GET {{BASE_URL}}/api/plants/{plant_id}
  2. Suggest a care adjustment (schema below)
  3. POST {{BASE_URL}}/api/conditions/{id}/care-update with the payload

## Enrichment payload schema (POST /api/plants/:id/enrichment)
{
  "latin_name": "Sansevieria trifasciata",
  "common_names": { "en": ["Snake plant", "Mother-in-law's tongue"], "nl": ["Vrouwentong", "Sanseveria"] },
  "origin": "West Africa",
  "lore": "2-3 sentences about cultural history, naming, etc.",
  "care": { "base_interval_days": 14, "light_preference": "bright_indirect", "placement_hints": "..." },
  "conditions": [{ "name": "...", "remedy": "...", "severity": "info|warning" }, ... up to 15],
  "facts": [ "...", "...", ... 15-25 trivia-tone facts, 100-200 chars each, no Q&A framing ]
}

## Style anchors for facts
Match this tone — short, declarative, surprising, single sentence:
1. {{SAMPLE_FACT_1}}
2. {{SAMPLE_FACT_2}}
... 8-10 samples drawn at copy-time from the existing facts table

## Care-update payload schema (POST /api/conditions/:id/care-update)
{
  "interval_delta_days": -2,
  "light_preference": "bright_indirect",
  "rationale": "1-2 sentences explaining the suggested change"
}

## Important rules
- Respond by making HTTP calls. Do not write summaries.
- Match the schema exactly. Reject your own output if any required field is missing.
- For facts: read existing facts first via GET /api/plants/{id}/facts to avoid duplicates.
- If you cannot find a confident answer for a field, omit it (server validates required fields).
- Multilingual: en and nl are required keys, but empty arrays are acceptable if you can't find names.
```

### Where it lives in code

- The skeleton template lives in `packages/api/client/src/lib/ai-setup-prompt.ts` as a template string with `{{BASE_URL}}` and `{{SAMPLE_FACT_*}}` placeholders.
- Sample facts are fetched from a new endpoint `GET /api/facts/samples?n=10` that returns 10 random rows from `facts` — fresh anchors every copy, so the AI gets variety.
- `BASE_URL` is `window.location.origin` at click time.

### Two design notes for implementation

1. **Care-update schema.** The sketch above lists `interval_delta_days` + `light_preference` + `rationale`. The implementation plan must start by reading `claude-enrich.ts`'s `updateCareForCondition` output shape and using *that* as the contract. If the function returns more (or less), the schema in the prompt template aligns to the function's actual output, not to this sketch.
2. **Sample facts at copy-time.** Samples are baked into the copied prompt at click time. They're frozen the moment the user copies. Acceptable trade-off vs. asking the AI to fetch samples itself: the prompt is meant to be re-copied if styles drift, and embedding samples is much more reliable than trusting the AI to call a samples endpoint.

## 6. Documentation deliverables

### `INSTALL.md` (new, repo root)

The single document a stranger reads to go from "I just heard about plant-trmnl" to "I have it running and enrichment is happening on a schedule." Sections:

1. **What you'll need** — TRMNL device (OG or X), a server to run plant-trmnl on (Pi, NAS, Mac, Linux box), Docker, an AI tool that can run scheduled tasks (or a copy-paste-capable AI for manual mode).
2. **Install** — `git clone`, copy `.env.example` to `.env`, fill in `TRMNL_API_KEY` + `TRMNL_PLUGIN_UUID` + (optional) `BACKUP_PATH`, `docker compose up -d`. ~5 commands total.
3. **Set up your TRMNL plugin** — link to TRMNL docs for creating a Private Plugin, paste the Liquid template from `docs/trmnl-templates/full-view.liquid`, save.
4. **Connect your AI** — open the Settings page, click "Copy AI setup prompt," follow recipe for your AI tool: Claude Desktop, ChatGPT scheduled tasks, Cursor, Ollama, n8n. Each gets a 3-step recipe.
5. **First plant** — add a plant via the web app, watch the AI fill it in within an hour.
6. **Troubleshooting** — pending count not dropping, TRMNL not refreshing, scheduling oddities.
7. **Limitations** — no auth on enrichment endpoints; meant for LAN/local use; documented as a known limitation slated for v1.1.

### `CHANGELOG.md` (new, repo root)

Format: [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). Sections per release: Added, Changed, Deprecated, Removed, Fixed, Security.

Backfill structure:

- `## [Unreleased]` — Wave 8 changes go here as we work
- `## [0.7.0] — 2026-04-25` — Wave 7 (n8n removal + AddPlant flake)
- `## [0.6.0] — 2026-04-24` — Wave 6 (PLNT rename, hamburger nav, favicon)
- `## [0.5.0] — 2026-04-24` — Wave 5 (catalog foundation, dry-soil calibration, daily facts, rich care)
- `## [0.4.0] — 2026-04-23` — Wave 4 (E2E lifecycle, archived view, stats card, notes log, origin story)
- `## [0.3.0] — 2026-04-22` — Wave 3 (batch water, calendar strip, overflow rebalance, pot categories, bug fixes)
- `## [0.2.0] — 2026-04-22` — Wave 2 (welcome state, undo, archive with reason, seasonal modifier)
- `## [0.1.0] — 2026-04-22` — Wave 1 (identifier, Docker hygiene, feedback system)
- `## [0.0.1] — 2026-04-07` — initial scaffold

Backfill is mechanical: read git log between Wave-N and Wave-(N+1) merge SHAs, summarize commits in user-visible language. ~2 hours.

When the public flip happens (post-Wave 8), `[Unreleased]` becomes `[1.0.0] — 2026-MM-DD`.

### `docs/RELEASE-PROCESS.md` (new)

Maintainer-facing playbook. Per #57 acceptance criteria, plus the new Wave 8 hygiene additions. Sections:

1. **Cadence** — release on demand, target ~monthly.
2. **Pre-release checklist** — CHANGELOG accuracy, README accuracy, INSTALL.md smoke-tested on a clean machine, ROADMAP review, refactor rotation pick, full test suite green.
3. **Pre-public-flip checklist (one-time, executed before v1.0.0)** — see Section 7.
4. **Tagging & release notes** — `git tag -a vX.Y.Z`, push, draft GitHub release notes from CHANGELOG.
5. **Refactor rotation** — rotating list (Renderer / Scheduling / Database / Client / Catalog / TRMNL template); pick one per release; do targeted improvements.
6. **Post-release watch** — 1 week monitoring window for community-reported install issues; patch release if needed.

### README rewrite

The current README is dev-doc-shaped ("how to run locally"). Rewrite as "what is plant-trmnl, why care, screenshot, link to INSTALL.md." Three-paragraph elevator pitch + screenshot + features list + INSTALL link. Detailed install moves to `INSTALL.md`. Roughly 150 lines down to ~50.

## 7. Hygiene cleanup (Blockers B + C) + pre-flip checklist

### Blocker B — sanitize personal paths in HEAD

Three files have `[redacted-path]/...`, `[private-repo]`, or `[private-repo]` references in HEAD. They are documentation; no code touches these strings. Edits:

- `docs/specs/2026-04-07-plant-trmnl-design.md` lines 223-224, 238-239, 640-643 — replace `[redacted-path]/Downloads/trmnl-*-*.png` paths with relative `docs/mockups/<descriptive-name>.png` paths. Verify the referenced PNGs already exist in `docs/mockups/`; if not, copy them from the Downloads originals during implementation.
- `docs/plans/2026-04-07-plant-trmnl-plan.md` lines 108, 112, 116 — rewrite as "adapt the ATLAS workflow from a related project," "adapt the GROOM workflow from a related project," "adapt FINE from a related project." Drop the absolute paths and the project names entirely.
- `docs/plans/2026-04-24-wave-5-manual-test.md` — replace all `localhost` occurrences with `localhost` (or `${PLANT_API_HOST:-localhost}` where shown as a parameterized example).

### Blocker C — `docker-compose.yml` backups path

Replace `${HOME}/Backups/plant-trmnl` (current) with `${BACKUP_PATH:-./backups}`. Add `BACKUP_PATH=` (commented, with explainer) to `.env.example`. Document in `INSTALL.md` that `./backups` is created automatically by docker compose.

### Pre-flip checklist — codified, NOT executed in Wave 8

Lives in `docs/RELEASE-PROCESS.md` under "Pre-public-flip (one-time)." Steps:

1. **Run history audit script** — `scripts/pre-flip-audit.sh` (new in Wave 8). Greps the entire git history for: `/Users/`, `192.168.`, `[private-repo]`, `[private-repo]`, `sk-ant-`, real plugin UUIDs, real device keys, email addresses. Exits non-zero if any hit. On the first pre-flip run this **will** find hits in old commits (the Blocker-B cleanup in Wave 8 only fixes HEAD, not history); that's the trigger for step 2.
2. **Surgical history rewrite via `git filter-repo`** — recipe with exact `replacements.txt` content checked into `scripts/filter-repo-replacements.txt`. Run the rewrite, then re-run the audit script — it should now exit 0. Force-push.
3. **GitHub Issues audit** — `scripts/audit-issues.sh` runs `gh issue list --limit 200 --state all --json number,title,body | jq` and greps for the same patterns. Issues with hits get edited via `gh issue edit N --body @-`. Issues #52 and #56 are known to need edits.
4. **README final pass** — make sure no personal commit signatures, no internal links.
5. **Repo settings flip** — Settings → General → Visibility → Change to public.
6. **Tag v1.0.0** — `git tag -a v1.0.0 -m "..."`, `git push origin v1.0.0`.
7. **GitHub Release** — draft from CHANGELOG.

This whole checklist is a *documentation deliverable* in Wave 8. Actual execution happens at the public-flip event (likely 1-2 weeks after Wave 8 merges).

### Why these scripts ship in Wave 8

Putting the audit/rewrite recipe under version control means the checklist is reproducible. Future contributors who want to extract a fork can run the same audit. The scripts also serve as **executable documentation** of "what counts as sensitive."

### What we're NOT doing in Wave 8

- Not running the filter-repo rewrite. The repo stays with its current history. We're shipping the *recipe* and the *audit*, not the rewrite.
- Not editing GitHub issues to scrub leaks — the audit script flags them; the actual edits run pre-flip.
- Not flipping the repo public.

## 8. Testing

**Baseline before Wave 8:** ~507 API + 43 renderer + ~110 client (~660 total).

**Expected after Wave 8:**

| Suite | Delta | Reason |
|---|---|---|
| API | -N (delete `claude-enrich.test.ts` if present) +M (new `enrichment-queue.test.ts` with ~12 cases for the 4 new endpoints) | Net ~+5 to +10 |
| API | +2 cases in `routes/plants.test.ts` (verify post-POST/PUT, status is `pending` and no SDK was invoked) | +2 |
| API | +2 cases in `routes/conditions.test.ts` (same pattern: condition flag → `care_update_status='pending'`) | +2 |
| Client | +4 cases in `Settings.test.tsx` (button renders, copy fires, toast appears, pending count surfaces) | +4 |

**Net target:** ~675 tests, all green. No regression in `lifecycle.test.ts` or `callback.test.ts`.

**Manual smoke test** (documented in `docs/plans/2026-04-25-wave-8-manual-test.md`):

1. Add a plant via the web app. Verify it lands with `enrichment_status='pending'`. Verify nothing crashes (no SDK call attempted).
2. `curl GET /api/plants?enrichment=pending` — plant appears.
3. `curl POST /api/plants/<id>/enrichment` with a hand-crafted payload — plant data populates, status flips to `complete`, facts seeded, scheduling event logged.
4. Open Settings, click "Copy AI setup prompt" — clipboard contains a string with the right base URL and 8-10 sample facts.
5. Flag a condition on a plant. Verify `care_update_status='pending'`.
6. `curl POST /api/conditions/<id>/care-update` — care updates apply.

## 9. File inventory

```
DELETE:
  packages/api/src/enrichment/claude-enrich.ts
  packages/api/src/enrichment/claude-enrich.test.ts (if present)

MODIFY (code):
  packages/api/package.json                    (drop @anthropic-ai/claude-agent-sdk)
  packages/api/package-lock.json               (regenerated by npm install)
  packages/api/src/routes/plants.ts            (drop import + 3 .catch blocks)
  packages/api/src/routes/conditions.ts        (drop import + replace 1 callsite with status write)
  packages/api/src/routes/plants.test.ts       (drop SDK mocks, assert status only)
  packages/api/src/routes/conditions.test.ts   (same)
  packages/api/src/database/schema.ts          (addColumnIfMissing for conditions.care_update_status)
  docker-compose.yml                           (BACKUP_PATH default)
  .env.example                                 (BACKUP_PATH commented)

CREATE (code):
  packages/api/src/routes/enrichment-queue.ts  (4 new endpoints)
  packages/api/src/routes/enrichment-queue.test.ts
  packages/api/client/src/lib/ai-setup-prompt.ts
  packages/api/client/src/pages/Settings.tsx   (extend existing — add "Connect your AI" section)
  packages/api/client/src/pages/Settings.test.tsx (extend)
  packages/api/src/routes/facts.ts             (or extend existing — add GET /api/facts/samples)

CREATE (docs):
  INSTALL.md
  CHANGELOG.md
  docs/RELEASE-PROCESS.md
  docs/plans/2026-04-25-wave-8-design.md       (this doc)
  docs/plans/2026-04-25-wave-8-plan.md         (next, via writing-plans skill)
  docs/plans/2026-04-25-wave-8-manual-test.md
  scripts/pre-flip-audit.sh
  scripts/filter-repo-replacements.txt
  scripts/audit-issues.sh

MODIFY (docs):
  README.md                                    (rewrite, slim)
  docs/specs/2026-04-07-plant-trmnl-design.md  (Blocker B paths)
  docs/plans/2026-04-07-plant-trmnl-plan.md    (Blocker B paths + project names)
  docs/plans/2026-04-24-wave-5-manual-test.md  (192.168.x → localhost)
```

## 10. Rollout

- **Branch:** `feat/wave-8-community-release`
- **PR title:** `feat: Wave 8 — community-installable, in-process LLM removed`
- **PR body:** lists each section above with checkboxes, plus a manual test plan, plus an explicit "do NOT merge until manual smoke test passes."
- **Merge:** squash, delete branch, single commit on `main`.
- **Post-merge:** 1-2 week dog-food window. Set up Claude Desktop scheduled task pointing at the live plant-trmnl. Watch pending counts go to 0. Watch facts populate. Note rough edges.
- **Then:** run pre-flip checklist. Tag v1.0.0. Flip public.

### Issues touched

- Closes (this wave): nothing. Close events happen at the public-flip ceremony, where v1.0.0 release notes do the closing.
- Comments + leaves open: #52 (architecture done; pre-flip steps remain), #56 (UX done; close at flip), #57 (RELEASE-PROCESS shipped; close at flip).
- Closes WONTFIX: #58.

## 11. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Existing pending plants fail validation when Claude Desktop starts enriching them (different prompt → different output shape than what server expects) | Medium | New `POST /api/plants/:id/enrichment` returns 400 with explicit per-field errors. AI tools self-correct in the next loop. Documented in INSTALL.md troubleshooting. |
| User copies the setup prompt to ChatGPT but ChatGPT's web UI has no scheduled tasks → user is confused | High | INSTALL.md per-tool recipes. ChatGPT free → manual run mode (paste the prompt, AI runs once, run again next day). Documented as expected behavior. |
| BASE_URL in copied prompt is `localhost:3000` because user copied from a dev environment, not their actual server URL | Medium | The button reads `window.location.origin` — if the user accesses plant-trmnl via its actual URL (e.g., `http://nas.local:3900`), that's what gets copied. INSTALL.md says "open Settings from the same URL your AI tool will use." |
| Removing the SDK silently breaks something we forgot about (some cron, some test fixture) | Medium | Full test suite + manual smoke test. CI runs everything. Plus: `grep -rn "claude-enrich\|enrichPlantWithClaude\|updateCareForCondition\|@anthropic-ai/claude-agent-sdk" packages/` should return 0 hits at end of wave. |
| Care-update payload schema in Section 5 turns out wrong because the sketch was made without reading the current SDK output | Medium | Implementation plan starts with: read `claude-enrich.ts` `updateCareForCondition`; capture exact output shape; that's the contract. The prompt template aligns to the function's actual output, not the sketch. |
| 1-2 week dog-food window slips into months — wave shipped, public flip never happens | Low | Self-imposed deadline; not a code risk. Track in MEMORY.md so the next session knows the public flip is the open thread. |

## 12. Dog-fooding bridge — what changes for Emiel personally

Wave 8 means Emiel's own deployment also goes pull-based. Until Claude Desktop (or any other AI) is wired up against his live plant-trmnl, new plants stay `pending` and have no care data. This is the whole point — it's how we validate the community story before strangers see it.

The first dog-food task post-merge: open Claude Desktop, create a Scheduled Task, paste the AI setup prompt copied from Settings, set hourly cadence. Watch the pending queue drain. Note any rough edges. Iterate.

## 13. Open questions

None — all design decisions confirmed with Emiel on 2026-04-25 across the brainstorming dialogue. Implementation plan (next, via the `writing-plans` skill) handles the residual implementation-time decisions:

- Exact `updateCareForCondition` output shape → care-update schema alignment.
- Whether per-tool setup recipes in `INSTALL.md` link to deep anchors or open in a new tab.
- Decision on whether to rename the existing `enrichment_status='complete'` value or add a new `'externally_enriched'` value (default: keep `'complete'` — the source doesn't matter to consumers).
