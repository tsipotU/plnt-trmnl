# Plant TRMNL — 2026-04-22 Wave Progress & Session Summary

## Session Summary

5 PRs merged today (squash-merged, branches deleted). All tests passing: 339 tests (296 API + 43 renderer), up from 300 on session start. Shipped features: paginated event history endpoint, archive with reason/note/memorial UI, undo-water with state restoration, seasonal modifier applied to scheduling, welcome empty state with first-plant hints + celebration toast.

## Changelog

2026-04-22 evening: reshuffled post-test-feedback. Added bug-fix wave. Bumped illustrations (#5) from Wave 6 to Wave 4.

## Wave Plan Status

| Wave | Issues | Status | Notes |
|------|--------|--------|-------|
| **Wave 1** | #10 (#20), #8 (#20), #19 (feedback) | ✓ Done | Docker/healthchecks audit confirmed; identifier + feedback shipped. |
| **Wave 2** | #17, #14, #15, #13 | ✓ Done | Archive, undo-water, seasonal adjustment, welcome state all shipped. |
| **Wave 3** | #25, #26, #27, #28, #29 (partial), #30, #31, #6, #11, #12 | ⏳ Pending | Bug fixes (JSON render, undo timeout, button copy, flag button); UX polish (archive dialog, memorial toast, pot size, notes log). |
| **Wave 4** | #5 (BUMPED), #16 (UI), #9 (tests), #32, #33, #34, #35 | ⏳ Pending | Botanical illustrations, watering history timeline UI, integration tests, notes log, archived plants view, condition remediation, origin story tracking. |
| **Wave 5** | #1, #2, #3 (expanded), #4, #36, #37, #38, #39 | ⏳ Pending | Plant catalog, streamlined add-plant, rich care profiles, species facts, dry-soil scheduling, deep plant info, daily facts, did-you-mean fallback. |
| **Wave 6** | #40 (design pass), #7, #18 | ⏳ Deferred | Frontend design pass, TRMNL visual redesign, auto-detect conditions. |

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
