# Plant TRMNL — 2026-04-22 Wave Progress & Session Summary

## Session Summary

5 PRs merged today (squash-merged, branches deleted). All tests passing: 339 tests (296 API + 43 renderer), up from 300 on session start. Shipped features: paginated event history endpoint, archive with reason/note/memorial UI, undo-water with state restoration, seasonal modifier applied to scheduling, welcome empty state with first-plant hints + celebration toast.

## Changelog

2026-04-22 evening: reshuffled post-test-feedback. Added bug-fix wave. Bumped illustrations (#5) from Wave 6 to Wave 4.
2026-04-22 late: backlog grooming pass — 16 issues commented (scope boundaries, dependencies, cross-refs, AC additions). #16 retitled (API portion done). 6 dependencies added. No closures or merges — all 25 issues confirmed distinct.
2026-04-23 mid-day: feedback triage landed 20 new issues (#61–#81), slotted across Waves 4–6.
2026-04-23 evening: Wave 4 complete. All 6 feature PRs merged (#87 vitest hardening, #88 #9 E2E, #90 #34 URL fix, #91 #35 origin story, #92 #33 archived view, #93 #16 stats card, #94 #32 notes log). Original Wave 4 #5 (illustrations) closed as deferred. Tests: 340 API + 43 renderer + 35 client = 418 total, all green.

## Wave Plan Status

| Wave | Issues | Status |
|------|--------|--------|
| **Wave 1** | #10 (#20), #8 (#20), #19 (feedback) | ✓ Done |
| **Wave 2** | #17, #14, #15, #13 | ✓ Done |
| **Wave 3** | #25–31, #6, #11, #12 | ✓ Done — 11 PRs (#41–51) |
| **Wave 4** | #5 (deferred), #9, #16, #32, #33, #34, #35, #61–69, #73 | **✓ Done** — 6 PRs (#87, #88, #90–94) |
| **Wave 5** | #1–4, #36–39, #70–72, #74–77 | ⏳ Pending |
| **Wave 6** | #7, #18, #40, #78–81 | ⏳ Deferred (design-pass wave) |

Per-session summary + what-to-pick-up-next lives in [`HANDOFF.md`](HANDOFF.md).

## Grooming Notes (2026-04-22 late)

### Actions taken

| Issue | Action | Summary |
|-------|--------|---------|
| #2 | Dependency added | Depends on #1 (catalog must exist for dropdown flow) |
| #3 | Dependency added + cross-ref #37 | Depends on #1; scope boundary with #37 documented |
| #4 | Cross-ref #38 | Scope: fact generation only; display/rotation is #38 |
| #5 | Dependency added | Depends on #1 (species slugs needed for illustration keying) |
| #6 | Coupling note added | Batch water (#11) must trigger same overflow/rebalance check |
| #7 | Scope boundary vs #40 | TRMNL Liquid template only; web client redesign is #40 |
| #9 | Scope updated | Wave 2 features (archive, undo, seasonal, welcome) added to required E2E scenarios |
| #11 | AC added | Must include batch undo toast (15s window, restores all N plants) |
| #16 | Retitled + scope update | API shipped in PR #20; remaining scope is UI only (timeline component, stats card, trend indicator) |
| #18 | Independence confirmed vs #34 | No blocking dependency either direction; #34 recommended first |
| #29 | Scope boundary vs #40 | Targeted CSS fixes only — no full design pass here |
| #36 | Algorithm scope clarified | Replace not additive; migration note for existing plants added |
| #37 | Dependency added + cross-ref #3 | Depends on #1; scope boundary with #3 documented |
| #38 | Dependency added + cross-ref #4 | Depends on #4; display/rotation only, not generation |
| #39 | Dependency added | Depends on #1 (fuzzy match needs species list) |
| #40 | Scope boundary vs #7 | Web client only; TRMNL visual is #7 |

### Totals
- Closed: 0
- Merged/folded: 0
- Retitled: 1 (#16)
- Scope clarifications / boundary comments: 13 issues
- Dependencies added: 6 (#2→#1, #3→#1, #5→#1, #37→#1, #38→#4, #39→#1)
- Cross-references added: 3 pairs (#3↔#37, #4↔#38, #7↔#40)

### No merges/closures — all 25 issues are genuinely distinct
After full review: no two issues are 80%+ overlapping. The candidates flagged in the grooming brief all turned out to have clean scope boundaries once documented. The backlog is kept intact with boundary comments.

### Dependency order for Wave 5
Wave 5 has a hard ordering constraint:
1. **#1** (catalog) must land first — blocks #2, #3, #4 (partial), #5, #37, #39
2. **#4** (fact generation) before **#38** (daily rotation)
3. **#36** (dry-soil calibration rethink) is the most disruptive — plan it last in Wave 5 or run in parallel on a branch

### Items needing user decision
- **#32 (notes log):** Wave 4 has it, but it introduces a new `plant_notes` table with schema migration. Confirm whether existing `notes` textarea content should be migrated as a first entry or discarded.
- **#36 (calibration rethink):** This is a breaking algorithm change. Confirm whether it's Wave 5 or deferred to Wave 6 alongside #40 — it may be safer to ship all UX polish before touching the scheduling core.

## Important Gotcha

**Parallel agents branch clobbering:** Agents share the working directory without isolation (`isolation: "worktree"`), causing concurrent runs to interfere with git state. If 2+ agents run simultaneously, the second agent may check out a stale version of a branch mid-implementation on the first agent. **Solution:** Serialize agents in dispatcher config unless you explicitly add `isolation: "worktree"` per-agent.

## How to Resume Next Session

```bash
cd ~/Projects/plant-trmnl
git status
git log --oneline -10
```

Then open `docs/plans/2026-04-22-wave-progress.md` (this file) for context.

## Next Steps

1. **Wave 3 — bug fixes first** (#25 JSON render, #26 undo 15s, #27 watered button, #28 flag condition, #30 reason-toast variants, #31 pot dropdown), then medium features (#6 overflow, #11 batch water, #12 calendar). Most are small; #29 archive dialog CSS is a partial polish before the full Wave 6 design pass.
2. **Wave 4 — visuals + history** — #5 illustrations (bumped here per user feedback), #16 timeline stats + trend card, #9 integration tests, #32 notes log (new plant_notes table), #33 archived plants view, #34 condition remediation, #35 origin story.
3. **Wave 5 — catalog + deep features** — #1-4 Tier-1 catalog, #36 dry-soil calibration, #37 deep plant info, #38 daily fact rotation, #39 did-you-mean fallback.
4. **Wave 6 — design + deferrals** — #40 frontend-design pass, close #7 and #18 with deferral rationale.
