# Wave 3 Design — Bug Fixes, UX Polish, Scheduling & Batch Watering

**Date:** 2026-04-22
**Status:** Design approved, ready for implementation plan
**Scope:** 9 GitHub issues (#25, #26, #27, #28, #29, #30, #31, #6, #11, #12) — note #28 scoped down to "hide button"

## Summary

Wave 3 ships three classes of change in one wave:

1. **Bug fixes** (#25, #26, #27, #28) — small, disjoint, safe to parallelize
2. **UX polish** (#29, #30, #31) — disjoint file touches, parallelizable; #31 adds schema
3. **Medium features** (#6, #11, #12) — share files (`scheduling/`, `Dashboard.tsx`, event log), must serialize

A single cross-cutting architectural change underpins the features: the existing `findBestDate` bin-packer is currently only invoked from vacation-end recalc. We wire it into every code path that sets `next_water_date` and extend it to report shift metadata for event logging.

## Out of Scope

- Wave 4 issues (#5, #16, #9, #32, #33, #34, #35) — separate brainstorm cycle
- Wave 5 issues (#1–#4, #36–#39) — depends on catalog-first ordering
- Wave 6 issues (#7, #18, #40)
- #28 full implementation: the Flag Condition modal is deferred and will be designed alongside #34 (condition remediation) in Wave 4

## Issues in Ship Order

| # | Title | Phase | Complexity |
|---|-------|-------|------------|
| #26 | Undo-water 15s | 1 — bug | trivial |
| #27 | Watered button copy | 1 — bug | trivial |
| #25 | JSON render in timeline | 1 — bug | small |
| #28 | Hide Flag Condition button | 1 — bug | trivial |
| #29 | Archive dialog CSS polish | 1 — polish | small |
| #30 | Memorial toast variants | 1 — polish | small |
| #31 | Pot size dropdown + schema | 1 — polish | medium |
| #6 | Overflow / rebalance | 2 — feature | medium |
| #11 | Batch watering | 2 — feature | medium |
| #12 | 7-day calendar strip | 2 — feature | medium |

Each ships as its own PR.

## Phase 1 — Parallel-worktree safe

Each item below touches distinct files. Agents dispatched with `isolation: "worktree"` can run in parallel without clobbering.

### #26 Undo-water window 15s

- **File:** `packages/api/client/src/pages/PlantDetail.tsx`
- **Change:** `UndoToast` timeout prop `5000` → `15000`
- **Test:** extend existing undo test to assert the prop value

### #27 Watered button copy

- **File:** `packages/api/client/src/pages/PlantDetail.tsx`
- **Change:** button label `"💧 Mark as Watered"` → `"Watered"`; no structural or handler change
- **Test:** update the button-label test

### #25 JSON render in timeline

- **File:** timeline rendering in `PlantDetail.tsx` (or the event-row component it uses)
- **Change:** for events with `event_type === 'watered'`, do not render `old_value`. All other event types keep current rendering.
- **Rationale:** a friendly "restored to Y" summary is YAGNI — the user ask is "no raw JSON."
- **Test:** render timeline with a watered event, assert the JSON payload is not in the DOM; a non-watered event still shows its details.

### #28 Hide Flag Condition button

- **File:** `packages/api/client/src/pages/PlantDetail.tsx` Conditions card
- **Change:** remove the `+ Flag condition` button element. Conditions card still renders existing flagged conditions.
- **Test:** assert the button is not present in the rendered Conditions card.

### #29 Archive dialog CSS polish

- **File:** `packages/api/client/src/components/ArchiveDialog.tsx` + its inline-style block
- **Changes:**
  - Radio inputs: custom-styled via `input[type="radio"]:checked` sibling selectors → filled accent-colored dot when selected, empty gray ring when not
  - Labels: `display: flex; align-items: center; gap: 0.5rem` so label text aligns with the radio
  - All interactive elements min touch target: `min-height: 44px`
  - Confirm button `opacity: 0.5; cursor: not-allowed; disabled={!reason}` when no reason selected
- **Scope boundary:** targeted CSS only. Full visual redesign is Wave 6 (#40).
- **Test:** render dialog with no selection; assert confirm button has `disabled` attribute / `opacity: 0.5` style.

### #30 Memorial toast variants

- **New file:** `packages/api/client/src/utils/memorial.ts`
- **Pure function:** `buildMemorialMessage({ name, reason, createdAt, archivedAt }): string`
- **Duration helper:** `<12` months → `"N months"`; `>=12` months → `"N years"` (rounded)
- **Templates:**
  - `died` → `"{name} was in your care for {duration}. Rest well. 🌿"`
  - `gave_away` → `"{name} found a new home after {duration}. 🌱"`
  - `moved` → `"{name} is on its way to a new spot. {duration} of memories. 🌿"`
  - `other` → `"{name} was with you for {duration}."`
- **Wiring:** the component that fires the archive toast (`ArchiveDialog.tsx` or its parent) imports `buildMemorialMessage` and passes the result to the existing toast component.
- **Test:** table-driven unit tests per reason × duration boundaries (1 mo, 11 mo, 12 mo, 24 mo).

### #31 Pot size dropdown + schema

**Schema** (`packages/api/src/database/schema.ts`):

- Add to the `plants` `CREATE TABLE IF NOT EXISTS` block:
  - `pot_size_category TEXT`
  - `pot_size_cm REAL`
- Append to `initializeSchema`:
  - `addColumnIfMissing(db, 'plants', 'pot_size_category', 'TEXT')`
  - `addColumnIfMissing(db, 'plants', 'pot_size_cm', 'REAL')`
- Legacy `pot_size` column left in place (empty DB; idempotent migration keeps it). It will be removed in a later cleanup PR — not in this wave.

**API** (`packages/api/src/routes/plants.ts`):

- POST accepts `{ pot_size_category, pot_size_cm }` (both optional, nullable)
- PUT accepts both using the existing "is the field present" sentinel pattern noted in CLAUDE.md (so explicit nulls are clearable)
- GET returns both fields
- Validation: `pot_size_category` if present must be one of `{"Extra Small", "Small", "Medium", "Large", "Extra Large", "Other"}`; `pot_size_cm` if present must be a positive number. No pair-coherence checks.

**Client**:

- `AddPlant.tsx` and `PlantDetail.tsx` edit surface:
  - Native `<select>` with the 6 options
  - When a named size is selected, both fields are set (see midpoints below)
  - When "Other" is selected, reveal a numeric input that sets `pot_size_cm`; `pot_size_category` stays `"Other"`
  - Midpoints: XS=7.5, S=12.5, M=17.5, L=25, XL=40 (cm)

**Display**:

- On plant list/detail: show `{pot_size_category}` primarily, with `{pot_size_cm} cm` as secondary if present. For "Other", show `{pot_size_cm} cm` only.

**Tests**:

- API round-trip POST → GET with both fields
- Client renders the Other input only when Other is selected
- Client renders the correct midpoint when a named size is picked

## Phase 2 — Serialized features

All three touch shared files (scheduling, Dashboard, event log schema). Run sequentially. Run tests between each PR.

### #6 Multi-plant watering day: overflow & rebalance

**Core change:** wrap `findBestDate` in a result-bearing helper so callers can log events based on what happened.

**New in** `packages/api/src/scheduling/bin-packer.ts`:

```ts
export interface ScheduleResult {
  date: string;              // chosen next_water_date
  originalIdeal: string;
  overflowShifted: boolean;  // chosen !== ideal
  congested: boolean;        // ideal was at capacity AND we still returned it (window full)
}

export function scheduleNextWater(
  idealDate: string,
  location: string,
  existing: ScheduledPlant[],
): ScheduleResult
```

`overflowShifted` and `congested` are mutually exclusive by construction: if we shifted, we didn't return the ideal; if we returned the ideal AND capacity was full, we're congested.

**Call sites to migrate:**

| Site | File | Current | After |
|------|------|---------|-------|
| Plant create (enrichment sets first date) | `enrichment/callback.ts`, `enrichment/claude-enrich.ts` | raw `today + interval` | `scheduleNextWater` + events |
| Regular water | `routes/plants.ts` POST `/:id/water` | raw `today + interval × seasonal` | `scheduleNextWater` + events |
| Batch water (new, #11) | `routes/plants.ts` POST `/water-all` | n/a | `scheduleNextWater` per plant + events |
| Calibration interval change | `routes/calibration.ts` | raw `last_watered + new_interval` | `scheduleNextWater` + events |
| PUT `/:id` interval edit | `routes/plants.ts` PUT | already recalcs | `scheduleNextWater` + events |
| Vacation end | `scheduling/vacation.ts` | already bin-packs | use `scheduleNextWater` for consistency + events |

**Event log additions** (reuse existing `event_log` table):

- `overflow_rebalance` — `old_value = JSON({ ideal: "YYYY-MM-DD" })`, `new_value = JSON({ chosen: "YYYY-MM-DD", delta_days: N })`, fired when `overflowShifted === true`
- `schedule_congested` — `old_value = JSON({ ideal: "YYYY-MM-DD" })`, `new_value = null`, fired when `congested === true`

Both are emitted in addition to the existing `watered`, `seasonal_adjustment`, etc. events — they don't replace them.

**Archive behavior:** no rebalance on archive. Gap days are fine. This matches current behavior and the issue AC.

**TRMNL screen (multi-plant layout):**

- `GET /api/screen` currently returns one "today's plant." Extend to return up to `MAX_PLANTS_PER_DAY` plants due today (array, ordered by `next_water_date ASC, id ASC`). One-plant and zero-plant responses unchanged in shape.
- `docs/trmnl-templates/full-view.liquid`: add `{% if plants.size == 1 %} ... {% elsif plants.size == 2 %} ... {% else %} ...rest day... {% endif %}`. Two-plant branch uses the existing `layout--col` framework class for side-by-side cards.
- Next-watering footer: already shows the nearest upcoming plant; scope to plants excluded from today's due set so the footer doesn't duplicate.

**Tests:**

- `scheduleNextWater` unit tests: ideal available; overflow one day; overflow at edge of ±3 window; full window → congested=true, overflowShifted=false; location-bonus tie-breaker
- Integration tests per call site: `POST /:id/water` with a crowded schedule → `next_water_date` is shifted AND an `overflow_rebalance` event exists
- Renderer: screen endpoint returns 2 plants on a multi-plant day; Liquid template snapshot for the 2-plant layout

### #11 Batch watering

**Shared helper:** extract the body of `POST /:id/water` into `waterPlant(db, plantId, heatingConfig): WateredResult` in `routes/plants.ts` (or a new `scheduling/water.ts`). Single-water and batch-water both call it.

`WateredResult` carries the updated plant plus event metadata (`batch_id`, shift flags) so the caller can log events consistently.

**New column** on `event_log`:

- `batch_id TEXT NULL` — idempotent migration via `addColumnIfMissing`. Set on every `watered` event. For single-water calls, a fresh UUID per call. For batch-water calls, one UUID shared across all plants in that call.

**New endpoint:** `POST /api/plants/water-all`

- Body: `{ plant_ids?: number[] }`
- If `plant_ids` omitted: waters all `archived = 0 AND next_water_date <= today` plants
- If present: waters only those IDs (404 on any unknown ID — all-or-nothing)
- For each plant: invoke `waterPlant`; all share one `batch_id`
- Returns `{ batch_id, watered: Plant[], events: { plant_id, event_type }[] }`

**New endpoint:** `POST /api/plants/undo-batch`

- Body: `{ batch_id: string }`
- Finds all `watered` events with that `batch_id`
- Restores each plant's preState from each event's `old_value` JSON
- Deletes those events
- Returns `{ restored: Plant[] }`
- All-or-nothing: partial undo not supported

**Client — Dashboard:**

- `Dashboard.tsx` computes `N = dueToday.length` reactively
- When `N >= 2`: render `"Water all (N)"` button above the plant list
- Tap → `POST /water-all` with the explicit `plant_ids` of what's currently showing as due (so UI and server agree)
- Per-card `"Watered"` button still works; after a partial watering, `N` drops and the button re-renders (hides at `N < 2`)

**Sequential calibration modal:**

- New component `packages/api/client/src/components/CalibrationSequence.tsx`
- Props: `plantIds: number[]`, `onComplete: () => void`
- For each ID: `GET /api/plants/:id/calibration-question`
  - If `{ skip: true, reason: 'converged' }`: advance silently
  - Otherwise: render existing single-plant calibration modal with header `"{name} — {question}"` and `"{i} of {n}"` progress
- After last answer, call `onComplete`

**Batch undo toast:**

- Component: `BatchUndoToast` (can share primitive with existing single `UndoToast`)
- 15s timeout (aligned with #26)
- Tap → `POST /undo-batch` → dashboard refetches plants and schedule
- Auto-dismiss after 15s; no undo available after

**Tests:**

- Unit: `waterPlant` helper covers single-plant path
- Integration: `POST /water-all` with 3 due plants — all watered, all `watered` events share one `batch_id`, overflow events emit correctly
- Integration: `POST /undo-batch` — all N plants restored, all N events deleted
- Client: `CalibrationSequence` skips converged plants; Dashboard button hides when N < 2

### #12 Upcoming watering calendar

**New endpoint:** `GET /api/schedule/week?from=YYYY-MM-DD`

- New file: `packages/api/src/routes/schedule.ts`
- `from` defaults to today (server TZ) when omitted
- Returns:

```json
{
  "days": [
    {
      "date": "2026-04-22",
      "is_today": true,
      "plant_ids": [1, 4],
      "plant_names": ["Monstera", "Pothos"],
      "count": 2,
      "overdue_ids": [7],
      "vacation": false
    }
  ]
}
```

- **Overdue rollup:** only on `is_today = true`. Plants with `next_water_date < today AND archived = 0` fold into today's `overdue_ids` and bump `count`.
- **Vacation overlay:** for dates in an active vacation range, `vacation = true`. Plant lists stay populated; UI uses the flag for an icon.
- **Query:** one range query `SELECT id, name, next_water_date, location FROM plants WHERE archived = 0 AND next_water_date BETWEEN ? AND ?` plus the vacation range lookup, bucketed in JS.

**Client — CalendarStrip component:**

- New file `packages/api/client/src/components/CalendarStrip.tsx`
- Placed on `Dashboard.tsx` above the plant list
- 7 horizontal pill cells, horizontal scroll on small screens
- Each cell shows: weekday abbrev ("Mon"), date number, count badge (`N` or `-` for rest day)
- Today's cell uses `--accent` border
- Vacation cells overlay the vacation icon used by `VacationToggle`
- **Tap behavior:** inline expand — tapping a cell renders a single-line row directly below the strip with the plant names for that day. Tap same cell again to collapse; tap another cell to switch. No modal, no navigation.
- **Overdue:** today's cell gets a subtle "!" marker; expanded row shows "Overdue (N)" group at top

**Reactivity:**

- New hook `useWeekSchedule()` in `client/src/hooks/` exposes `{ days, refresh }`
- `Dashboard.tsx` calls `refresh` on the same events that trigger plant refetch (single water, batch water, undo, batch undo)

**Tests:**

- API: 7 days returned; today rolls up overdue; plant on day 5 in plant_ids[5]; vacation range flags; `from` param shifts window
- Client: 7 cells rendered; today highlight; tap expands; vacation icon when flag; count updates after a simulated watering

## Event Schema — Summary

New event types introduced this wave:

| Event type | old_value | new_value | Emitted by |
|-----------|-----------|-----------|------------|
| `overflow_rebalance` | `{ideal}` | `{chosen, delta_days}` | every `scheduleNextWater` call when shifted |
| `schedule_congested` | `{ideal}` | null | every `scheduleNextWater` call when congested |

New column on `event_log`:

| Column | Type | Purpose |
|--------|------|---------|
| `batch_id` | TEXT NULL | Set on every `watered` event. Groups a batch-water into an undoable unit. |

New columns on `plants`:

| Column | Type | Purpose |
|--------|------|---------|
| `pot_size_category` | TEXT | User's chosen category label |
| `pot_size_cm` | REAL | Numeric pot diameter (midpoint or custom) |

All schema changes apply via `addColumnIfMissing` at the bottom of `initializeSchema`.

## Testing Strategy

- **Unit tests** for pure helpers (`scheduleNextWater`, `buildMemorialMessage`, `waterPlant`)
- **Integration tests** for each new/modified endpoint, with a real SQLite file DB to exercise WAL behavior
- **Client tests** for Dashboard button logic, CalendarStrip rendering, CalibrationSequence progression, Archive dialog disabled state
- **Snapshot test** for the TRMNL Liquid 2-plant layout (renderer package)
- **Client `npm run build`** run at the end of each PR to catch tsc-only errors that vitest won't (learned 2026-04-22)

## Execution Strategy

**Phase 1 — parallelizable** (#26, #27, #25, #28, #29, #30, #31):

- Dispatch with `isolation: "worktree"` per agent. Each agent gets its own worktree under `/tmp/` off a fresh branch from `main`.
- Each PR merged independently as it lands.
- #31 has the largest blast radius in Phase 1 (schema migration + two UI pages); if any Phase 1 item is going to fail first, it will be #31 — review it first when PRs land.

**Phase 2 — serialized** (#6 → #11 → #12):

- #6 first: extracts `scheduleNextWater`, wires it into existing call sites, adds event types. Establishes the helper #11 will reuse.
- #11 second: extracts `waterPlant`, adds `/water-all`, `/undo-batch`, batch undo UI. Consumes `scheduleNextWater` via `waterPlant`.
- #12 third: pure additive (new route, new component). Only touches Dashboard to mount the strip and add the refresh hook.
- Run full test suite + `npm run build` between each PR merge.

**Post-wave verification:**

- All 339+ tests pass (number increases with each PR)
- `npm run build` green in `packages/api/client/`
- Live API restart + smoke test: add a plant, water it, check TRMNL screen returns expected shape, calendar strip renders

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Bin-packer wiring breaks existing scheduling behavior | Keep `findBestDate` unchanged; `scheduleNextWater` is an additive wrapper. Existing vacation-end tests must continue to pass. |
| Event log growth from overflow/congested events | Events are small; no trigger for truncation in this wave. Revisit if plants > 100. |
| Batch UUID collision | UUID v4; collision probability negligible. No unique-key constraint needed. |
| Dashboard re-render cost with strip + list | Both data sources already cached by React Query (or equivalent); strip refetches in parallel with plant list, not sequentially. |
| #31 legacy `pot_size` column stays unused | Acceptable for this wave. Flag for cleanup PR in Wave 4 or later. |

## Open Questions

None. All design decisions captured above.

## Next Step

Invoke the writing-plans skill to produce the implementation plan based on this spec.
