# Wave 12 — Polish & Feedback (Design Spec)

**Date:** 2026-04-26
**Status:** Approved (decisions made unilaterally per Emiel directive — see HANDOFF for context)
**Scope:** GitHub issues [#126](https://github.com/tsipotU/plant-trmnl/issues/126) (date strip) + [#135](https://github.com/tsipotU/plant-trmnl/issues/135) (archive flow & memorial page).

## Goal

Burn down two well-specified UX issues that surfaced during dog-food: the date strip's selection ambiguity, and the awkward post-archive flow that drops users on a "zoomed-in" dashboard instead of a destination page.

Wave 12's mandate is *polish, no big new features*. These two issues fit. Heavier candidates (#59 PWA, #18 auto-detect, #133 conditions UI redesign) are explicitly out of scope.

## Why both halves of #135 are bundled

The bug fix ("post-archive nav goes to wrong place") needs a destination page that doesn't exist yet. Splitting into two waves would mean either landing the user on an empty `/archive/:id` route or leaving them on the dashboard for one wave — both are worse than just doing the redesign now. Wave 13's design pass can revisit visual polish; the IA introduced here is sound and won't need to change.

## Architecture

### #126 — Date strip

The current `CalendarStrip` component renders a horizontal scroll of 7 days starting from today, with the same green outline used for both today and the currently-selected day. Two problems:

1. Today and selected look identical → user can't tell which day they're viewing.
2. The strip is forward-only, anchored at today → no way to look back at recent waterings.

**Solution:**

- **Visual distinction.** Today gets a *filled green background* (high prominence). Selected (when not today) gets *outline + accent fill* (clearly a second visual treatment). When selected equals today, only the today treatment renders.
- **Layout.** Window expands from 7 days forward to **11 days centered on today** (5 back + today + 5 ahead). Today is centered horizontally on initial render via `scrollIntoView({ inline: 'center', block: 'nearest' })` against a ref on the today tile.
- **Scroll bounds.** No virtualization. The 11 days are all rendered; horizontal scroll lets the user reach the edges. Scroll position resets to today-centered when the user navigates away and back (handled by mount effect — re-runs naturally).

**API change:** `/api/schedule/week` gains an optional `?days=N` query param. Default stays at 7 (back-compat with anything that doesn't pass it). Caller in the dashboard hook passes `from=today-5&days=11`.

**Data shape:** Unchanged. The endpoint already returns `is_today` per day; that's the signal the component needs.

### #135 — Archive flow & memorial page

Two coupled problems:

1. **Post-archive nav is broken.** `PlantDetail.tsx` calls `setTimeout(() => navigate('/'), 3000)` after a successful archive. The 3-second delay leaves the user on a stale plant detail page; the eventual jump to `/` lands them in a "zoomed in" / mid-scrolled state.
2. **The archive page is built like a regular plant detail page.** Shows watering schedule, current/typical conditions, archive button (already archived!), location, pot size — none of which apply to an archived plant.

**Solution — three pieces:**

#### Piece A: New memorial page

A new page `MemorialPlant.tsx` mounted at route `/archive/:id`. Layout:

- **Header.** Species illustration (greyscale via `filter: grayscale(0.7)` if `illustration_path` is set, otherwise emoji fallback), title `In memoriam — {name}`, subtitle `lived in your home for {lifespan}`.
- **Stats grid.** Four tiles:
  - 🌊 `{n}` waterings
  - 🌿 `{n}` offspring
  - 📈 `{n}` calibration cycles before drift
  - 📅 Joined {date} · Archived {date}
- **Cause line.** `Cause: {reason}` (always shown) + ` — {note}` (when note exists).
- **Past-tense facts.** `Lived in: {location}` if location was set.
- **Footer action.** Single button: `Restore plant` (small, secondary styling, not at top of page).

**No watering schedule. No active conditions. No notes editor. No archive button. No current pot size.** A plant in the archive is a memory, not a task.

#### Piece B: Backend support

- New `GET /api/plants/:id/memorial` returns `{ plant: {...}, stats: { waterings, offspring, calibration_cycles, lifespan_days, joined_at, archived_at } }`. Single round-trip; server computes the stats so the client renders flat data.
- New `POST /api/plants/:id/restore` clears `archived`, `archived_at`, `archive_reason`, `archive_note`. Logs a `restored` event to `event_log`. Returns the unarchived plant row.
- The existing `GET /api/plants/:id` continues to return the plant whether archived or not (used by the redirect logic in piece C).

**Stats source — confirmed against current schema:**

| Stat | Source |
|---|---|
| Waterings | `SELECT COUNT(*) FROM event_log WHERE plant_id = ? AND event_type = 'watered'` |
| Offspring | `SELECT COUNT(*) FROM plants WHERE mother_plant_id = ?` |
| Calibration cycles | `plants.calibration_cycle` (already a column) |
| Lifespan days | `julianday(archived_at) - julianday(created_at)` |
| Joined / archived dates | `plants.created_at`, `plants.archived_at` |

**Stat dropped from issue spec:** *"~12L water given"*. The `event_log` doesn't store an amount-per-water column, and adding it now is scope creep. Mention in the implementation plan that a future "watering volume" feature is unblocked by adding `amount_ml` to the event payload.

**Stat dropped from issue spec:** *"how big it got" (terminal growth)*. No schema field captures this. Drop without trace; the field can come back later.

#### Piece C: Routing + redirects

- **App.tsx** registers a new route: `<Route path="/archive/:id" element={<MemorialPlant />} />`.
- **PlantDetail.tsx** archive flow changes from `setTimeout(() => navigate('/'), 3000)` to `navigate('/archive/' + id, { replace: true })` — immediate, replaces history (so back-button doesn't return to a stale detail page).
- **PlantDetail.tsx** also gains a guard at the top of render: if `plant.archived === 1`, `<Navigate to={'/archive/' + id} replace />`. This handles the "old `/plants/:id` URL for an archived plant" case from the issue's Gherkins.
- **ArchivedPlants.tsx** (the index list) updates each item's link from `/plants/:id` to `/archive/:id`.

## Data flow

```
User taps Archive on /plants/5
  → ArchiveDialog confirm
    → POST /api/plants/5/archive { reason, note }
      → response { archived_at, ... }
    → navigate('/archive/5', { replace: true })
      → MemorialPlant mounts
        → GET /api/plants/5/memorial
          → renders stats grid + restore action

User taps Restore on /archive/5
  → POST /api/plants/5/restore
    → response { plant }
  → navigate('/plants/5')
    → PlantDetail mounts (now archived = 0, no redirect)
```

## Component design

| File | Responsibility | Touches |
|---|---|---|
| `routes/schedule.ts` | Adds `?days=N` param (default 7) | API |
| `routes/plants.ts` | New `GET /:id/memorial`, new `POST /:id/restore` | API |
| `event_log` writes | Add `restored` to allowed event types if a CHECK constraint exists; emit event from restore handler | API |
| `client/src/hooks/useWeekSchedule.ts` | Pass `from=today-5&days=11` | Client |
| `client/src/components/CalendarStrip.tsx` | Two visual treatments + center-on-mount scroll | Client |
| `client/src/pages/MemorialPlant.tsx` | New page (stats grid, restore action) | Client |
| `client/src/pages/PlantDetail.tsx` | Change post-archive nav target; add archived-guard redirect | Client |
| `client/src/pages/ArchivedPlants.tsx` | Re-link items to `/archive/:id` | Client |
| `client/src/App.tsx` | Register `/archive/:id` route | Client |

Each unit has one clear responsibility. The Memorial page can be understood without reading PlantDetail; the schedule API change is back-compat so no migration needed.

## Error handling

- `GET /api/plants/:id/memorial` returns 404 if the plant doesn't exist. Returns the row regardless of `archived` flag — the client decides what to do with it (the design assumes archived = 1 but a defensive client could fallback to PlantDetail).
- `POST /api/plants/:id/restore` returns 404 if the plant doesn't exist; returns 200 + the unarchived row on success. No-op semantics: if the plant is already not-archived, treat as success (idempotent restore).
- Restore button shows toast `Failed to restore plant — please try again` on network error. No optimistic UI; wait for server confirmation before navigating.

## Testing

### API tests
- `schedule.test.ts`: existing tests still pass with no `?days` param. New test asserts `?days=11` returns 11-day window starting at `from`.
- `plants.test.ts`: GET memorial returns expected shape with computed stats; 404 for unknown plant.
- `plants.test.ts`: POST restore clears archived fields, logs event, returns row.

### Client tests
- `CalendarStrip.test.tsx`: today rendering ≠ selected rendering; selected = today shows only today treatment; 11-day strip; scrollIntoView called on mount.
- `MemorialPlant.test.tsx` (new): renders stats from mocked API; restore button calls API + navigates.
- `PlantDetail.test.tsx`: archive flow now navigates to `/archive/:id` (not `/`); archived plants on `/plants/:id` redirect to `/archive/:id`.

### No new e2e tests
Wave 12 stays within unit/integration boundaries. Existing test baselines (563 API / 130 client) should grow by ~10–15 tests total.

## Migration

- No DB schema migrations. All needed columns exist (`archived`, `archived_at`, `archive_reason`, `archive_note`, `mother_plant_id`, `calibration_cycle`, `created_at`).
- `event_log.event_type` is unconstrained TEXT — emitting a `restored` event needs no schema change.

## Out of scope (deferred)

- Public memorial sharing (social card)
- Multi-plant memorial overview / grief stats across the collection
- Animated grayscale fade transitions
- "How big it got" / terminal growth (no schema)
- "L of water given" (no schema)
- Visual identity polish on the memorial page (Wave 13's job)
- Common conditions card redesign (#133 — Wave 13)
- PWA, calendar view, identify-my-plant — all separate issues, separate waves

## Composition order for the implementation plan

1. **Date strip first** (smaller, lower-risk, warms up the testing patterns).
   - API: add `?days` param.
   - Hook: pass new params.
   - Component: visual + scroll behavior.
   - Tests: API + component.
2. **Memorial page** (bigger, builds on warmed-up patterns).
   - API: memorial + restore endpoints.
   - Page component + route registration.
   - PlantDetail nav fix + redirect guard.
   - ArchivedPlants link update.
   - Tests: API + component + integration.

Single squash-merge PR, two logical commits aligned to (1) and (2).
