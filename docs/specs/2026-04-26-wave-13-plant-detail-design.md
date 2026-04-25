# Wave 13 — Plant Detail Structural Rework (Design Spec)

**Date:** 2026-04-26
**Status:** Approved (decisions made unilaterally per Emiel directive — see HANDOFF for context)
**Scope:** GitHub issues [#134](https://github.com/tsipotU/plant-trmnl/issues/134) (plant passport epic), [#133](https://github.com/tsipotU/plant-trmnl/issues/133) (conditions cards), [#60](https://github.com/tsipotU/plant-trmnl/issues/60) (calibration UX).

## Goal

Three rewrites that all live on the plant detail surface:

1. **#134 (epic):** Reorganize the plant detail page into the "plant passport" information architecture — five conceptual layers stacked deliberately instead of a flat scroll built in build-order.
2. **#133:** Replace the visually broken "Common conditions" section with identical-height collapsible cards.
3. **#60:** Make calibration *feel* as smart as it is — explanation, progress, convergence celebration, drift toasts.

Wave 13 is **structural**, not visual. Visual identity work (palette, typography, logo) lands in Wave 16's pre-flip pass alongside #40. Wave 13 stays within the existing Tailwind/DaisyUI tokens.

## Why these three together

All three issues touch the same surface (`PlantDetail.tsx`). Doing them in separate waves would mean re-touching the same 65KB file three times, with each pass potentially undoing layout assumptions from the previous one. Bundling them into one wave lets the IA decisions in #134 inform where #133's cards land and where #60's calibration progress chip goes.

#134 is the **load-bearing** one — its IA decisions constrain how #133 and #60 surfaces appear. Build order: 134 → 133 → 60.

## Architecture

### #134 Plant passport — what we actually do

The original AC is "design doc + child issues filed." That's a thin deliverable for a wave when the plant detail page is already this big. I'm extending the scope to also implement the **foundational reorganization**:

- Image hero promoted to the top of the page (currently buried below stats).
- New **collapsible section primitive** so each section can collapse independently. Each existing card on the plant detail page is wrapped in this primitive — no content changes.
- **Full section reorder** to passport order — *deferred to a child issue.* Honest reason: `PlantDetail.tsx` is 1900+ lines of densely-nested JSX. A blind reorder of `<div className="card">` blocks is mechanically risky with the Edit tool and the diff would dwarf the rest of the wave. The primitive lands now; the reorder lands as a focused, isolated PR after Wave 13 ships. Tests verified order-independent (use `getAllByText`/`getAllByRole`), so the reorder is behaviorally safe; the deferral is purely about scope/risk hygiene.
- **Sticky in-page nav: deferred to a child issue.** Adds complexity, not v1-blocking.

The IA itself, mapped to existing components/data:

| Section | Data source | Existing component(s) | Change in Wave 13 |
|---|---|---|---|
| Hero | `plants.illustration_path`, `name`, `species`, `created_at` | inline JSX in PlantDetail | Promoted to top, larger image, age-in-collection subtitle |
| Quick care | `catalog.care.{light,water,humidity}` | inline JSX | Wrapped in collapsible section, no content change |
| This plant | `plants.{location,pot_size_cm,origin_type,mother_plant_id}` + `plant_conditions` | inline JSX | Wrapped in collapsible section, no content change |
| Schedule | `plants.{next_water_date,current_interval,is_converged}` | inline JSX + `CalibrationModal` | Wrapped in section + **#60 calibration progress chip + dialed-in badge** |
| Common conditions | `catalog.conditions[]` | existing inline cards | **#133: replaced with `<ConditionCard>` collapsible primitive** |
| History | `event_log` | inline timeline | Wrapped in collapsible section, no content change |
| Origin & lore | `catalog.about` (etymology, origin) | inline `AboutCard` | Wrapped in collapsible section, no content change |

**Filed-but-unimplemented child issues** (Wave 13 deliverable: file them with rich bodies, leave for later):

- `Plant detail: full section reorder to passport IA` — move existing wrapped sections into hero → quick care → this plant → schedule → common conditions → history → origin & lore order. Mechanically isolated from any other change; safe focused PR.
- `Hero block redesign` — full image-hero treatment with age, family, species, variety badges (Wave 14 / 16 design pass).
- `"This plant" section redesign` — current placement / pot / origin / mother-plant card system (post-passport-IA polish).
- `Sticky in-page nav` — for long pages, jump-to-section.
- `Origin & lore section refresh` — narrative card with etymology, place of origin (likely Wave 16 polish).

These are stubs for the next design pass. Wave 13 establishes the section-collapse primitive, promotes the image hero, and wraps existing sections in the primitive (in their current order).

### #133 Conditions cards

A **`<ConditionCard>`** primitive replaces the current ad-hoc rendering. Specs:

**Collapsed state:**
- Fixed height (72px target).
- Severity icon at left (⚠ for warning, ℹ for info — Unicode, no SVG).
- Single-line headline (`condition.name`) with text-overflow: ellipsis.
- Tag chips on right (`COMMON`, `species-specific`) with `min-width: 80px` for alignment.

**Expanded state:**
- Card grows to fit content; Remedy + Prevention sections rendered below the headline.
- Animation: ~150ms ease-in-out on `max-height`, respecting `prefers-reduced-motion: reduce`.

**Interaction:**
- Tap card OR Enter/Space when focused → toggle.
- Multiple cards can be expanded simultaneously (no auto-collapse).
- **Local React state** persists expanded set across re-renders within a session. **URL persistence dropped** — diverges from issue AC, but adds complexity for marginal benefit (conditions don't need shareable links). Note: this means refresh resets all cards to collapsed.

**Accessibility:**
- Card is a `<button>` with `aria-expanded` reflecting state.
- Severity icon has `aria-label` (`"warning"` or `"info"`).
- Both icon variants meet WCAG AA contrast in dark mode (verify with the existing palette).

### #60 Calibration UX — four pieces

#### Piece A: Explanation tooltip

A small `?` icon next to the calibration question title in `CalibrationModal.tsx`. On click → modal-within-modal (or expanded section) showing:

> **Why am I being asked this?**
> Published care data is a starting guess. Your home is unique. These quick taps help plant-trmnl learn when YOUR plant actually wants water.

State: `localStorage` key `calibration-explanation-seen` (boolean). First-time users see the tooltip auto-pulse subtly (CSS `@keyframes`) for 2 seconds; after they click and dismiss, the pulse never fires again. Manual access is always available via the `?` icon.

#### Piece B: Progress indicator

- **In `CalibrationModal.tsx` title:** "Calibration N of ~5" where `N = plants.calibration_cycle + 1` and the "5" is hardcoded as the convergence target (matches existing `checkConvergence` logic which requires 3 consecutive 3s; rough estimate).
- **On plant detail Schedule section:** small pill `🌱 Calibrating: 3 of ~5` (only when `is_converged = 0` and `calibration_cycle > 0`).
- **On dashboard `PlantCard.tsx`:** no change. Dashboard cards stay clean.

#### Piece C: Convergence celebration

The existing logic already flips `is_converged` 0 → 1 when three consecutive 3s arrive. Wave 13 adds the *transition detection*:

- API: `POST /api/calibration/answer` (existing route) returns the new field `convergence_event` in its response, set to one of:
  - `'converged'` — was 0, now 1
  - `'drifted'` — was 1, now 0
  - `null` — no transition
- New event types in `event_log` emitted on transitions:
  - `calibration_converged` — `reason`: `"Converged at {N}-day interval"`
  - `calibration_drift_detected` — `reason`: `"Drifted from {N}-day interval"`
- SPA: `CalibrationModal` (and `CalibrationSequence` for batch) reads `convergence_event` from the response and shows a toast:
  - `'converged'` → `"{Plant} is dialed in at {N} days."`
  - `'drifted'` → `"{Plant} is drinking differently lately — recalibrating."`
- Dashboard `PlantCard.tsx`: small `🌿 dialed in` badge when `is_converged = 1`. Tooltip on hover: "{N}-day cadence, calibrated to your home."

#### Piece D: Drift detection — already-there, just surfaced

**Critical context for the implementer:** I verified the current code. `checkConvergence` runs after every calibration answer and writes `is_converged` unconditionally. So if a plant is converged (=1) and then gives a non-3 answer, the next `checkConvergence` call returns false and the flag flips back to 0 — automatically.

This means **the algorithm doesn't change.** Wave 13's drift work is purely:

1. Detect the 1→0 transition (compare pre/post values in the calibration-answer route).
2. Emit `calibration_drift_detected` event.
3. Return `convergence_event: 'drifted'` in the response.
4. Toast in the modal.

The richer drift model from the issue body ("2 consecutive answers >1 step from converged mean") would require an actual algorithm change — different from what currently exists. **Deferred** to a v1.1 follow-up if simple surfacing isn't enough. Filed as a child issue at the end of Wave 13.

#### Calibration history sparkline

Issue marks this "low priority, v1.1 if scope tight." **Dropped from Wave 13.**

## Component design

| File | Action | Responsibility |
|---|---|---|
| `packages/api/src/routes/calibration.ts` | Modify | Detect convergence transition (0→1, 1→0); emit transition events; return `convergence_event` in response. |
| `packages/api/src/routes/calibration.test.ts` | Modify | Tests for transition detection + event emission. |
| `packages/api/client/src/components/ConditionCard.tsx` | Create | New collapsible card primitive for #133. |
| `packages/api/client/src/components/ConditionCard.test.tsx` | Create | Unit tests for collapse/expand + a11y. |
| `packages/api/client/src/components/CollapsibleSection.tsx` | Create | New section-level collapsible primitive for #134 IA. |
| `packages/api/client/src/components/CollapsibleSection.test.tsx` | Create | Unit tests. |
| `packages/api/client/src/components/CalibrationExplanation.tsx` | Create | The `?`-icon-triggered explanation panel for #60. |
| `packages/api/client/src/components/CalibrationModal.tsx` | Modify | Add `?` icon + explanation; "N of ~5" title; toast on convergence_event. |
| `packages/api/client/src/components/CalibrationSequence.tsx` | Modify | Same toast wiring for batch flow. |
| `packages/api/client/src/components/PlantCard.tsx` | Modify | Add 🌿 dialed-in badge when `is_converged = 1`. |
| `packages/api/client/src/pages/PlantDetail.tsx` | Modify | IA reorder + wrap each section in CollapsibleSection + render ConditionCards instead of inline + add calibration progress pill. |
| `packages/api/client/src/pages/PlantDetail.test.tsx` | Modify | Tests asserting section order + ConditionCard rendering + calibration pill. |

The two new primitives (`ConditionCard`, `CollapsibleSection`) live alongside existing components. They're small, focused, isolated. Each can be understood without reading PlantDetail.

## Data flow

### #133 conditions cards
```
PlantDetail
  → fetches /api/catalog/entry?species=X
    → catalog.conditions[]
  → maps to <ConditionCard> per item
    → local state: Set<conditionSlug> (which are expanded)
    → tap toggles membership in the Set
```

### #60 calibration transition
```
User answers calibration in CalibrationModal
  → POST /api/calibration/answer { plantId, questionId, answerValue }
    → DB: SELECT is_converged AS preIsConverged FROM plants WHERE id = ?
    → DB: INSERT INTO calibrations (...)
    → DB: UPDATE plants SET is_converged = newValue (existing logic)
    → IF preIsConverged === 0 && newValue === 1: log 'calibration_converged' event, set transition = 'converged'
    → ELSE IF preIsConverged === 1 && newValue === 0: log 'calibration_drift_detected', set transition = 'drifted'
    → ELSE: transition = null
    → response: { current_interval, is_converged, convergence_event: transition }
  → SPA receives response
    → switch (convergence_event):
        case 'converged': showToast(`${plant.name} is dialed in at ${interval} days.`)
        case 'drifted':   showToast(`${plant.name} is drinking differently lately — recalibrating.`)
        case null:        no toast
```

## Error handling

- **#133 cards:** No error states. Conditions list is read-only catalog data.
- **#60 explanation:** `localStorage` key not set is the default state; absence ≠ error.
- **#60 transition events:** If event-log insert fails, log but don't block the calibration response (the calibration itself must succeed; the analytics are best-effort).

## Testing

### API
- `calibration.test.ts`: Add tests for `convergence_event: 'converged'` on 0→1 transition; `'drifted'` on 1→0; `null` on no transition. Verify event_log writes for both transition types.

### Client
- **`ConditionCard.test.tsx`:** Renders collapsed by default. Click expands. Enter/Space toggles. Multiple cards can be expanded independently. `aria-expanded` reflects state.
- **`CollapsibleSection.test.tsx`:** Renders expanded by default (so the page reads naturally on mount). Click on header collapses. Children not in DOM when collapsed (or hidden, depending on implementation choice — pick one for perf+a11y).
- **`PlantDetail.test.tsx`:** Conditions section now renders `<ConditionCard>` not inline. Calibration pill renders only when `is_converged = 0` and `calibration_cycle > 0`. (Section-order assertion deferred along with the reorder itself — child issue.)
- **`CalibrationModal.test.tsx`:** Explanation tooltip first-visit auto-pulse, dismissal persists in localStorage. Title shows "N of ~5".
- **`PlantCard.test.tsx`:** Dialed-in badge renders only when `is_converged = 1`.

### No e2e tests
Stay within unit/integration boundaries. Existing baselines (575 API / 140 client) should grow by ~20 tests.

## Migration

- No DB schema changes. All needed columns exist (`is_converged`, `calibration_cycle`).
- New event types (`calibration_converged`, `calibration_drift_detected`) — `event_log.event_type` is unconstrained TEXT, no schema change needed.
- No data migration needed for existing plants — converged plants will just not see a "first convergence" toast (they were converged before this code shipped). That's correct — we don't want to spam toasts retroactively.

## Out of scope (deferred)

- **Visual identity** (palette, typography, logo) — Wave 16.
- **Sticky in-page nav for plant detail** — filed as child issue under #134.
- **Hero block visual redesign** (large image, age stats, variety badges) — child issue under #134.
- **"This plant" section redesign** — child issue under #134.
- **Origin & lore narrative card** — child issue under #134, likely Wave 16.
- **Calibration history sparkline / dot chart** — v1.1.
- **Richer drift detection algorithm** ("2 consecutive >1 step from mean") — v1.1 follow-up issue if simple transition surfacing proves insufficient.
- **URL-persisted expand state for conditions cards** — diverges from #133 AC, dropped for simplicity.
- **Per-question-type calibration** (turgor / weight / color) — explicit non-goal in #60.

## Composition order for the implementation plan

1. **#134 foundation** — `CollapsibleSection` primitive + IA reorder + image hero promotion + child issues filed. (Smaller infra change, sets the stage.)
2. **#133 conditions cards** — `ConditionCard` primitive + integration into the new IA's "Common conditions" section.
3. **#60 calibration** — API transition events → CalibrationModal + Sequence wiring → explanation tooltip → progress pill on PlantDetail → dialed-in badge on PlantCard.
4. **Final wrap** — full test run, docker rebuild, smoke test, CHANGELOG/HANDOFF, commit, close issues.

Single squash-merge PR, ~3-4 logical commit groups. Wave 13 is bigger than Wave 12 (~15 commits total) but within one-PR territory.

## Decisions deviating from issue ACs (flagged for review)

| Issue | AC asked for | Wave 13 ships | Why |
|---|---|---|---|
| #133 | URL-persisted expand state | Local React state only | Simpler. Conditions don't need shareable links. |
| #134 | Sticky in-page nav | Deferred to child issue | Not v1-blocking. |
| #134 | Each section's content redesigned | Sections wrapped only; content unchanged | Per-section redesigns deserve their own waves. |
| #134 | Full passport-order section reorder | Deferred to child issue | 1900-line PlantDetail.tsx reorder is mechanically risky bundled with three other deliverables. Tests are order-independent so the reorder is behaviorally safe but deserves its own focused PR. |
| #60 | Drift detection per "2 consecutive >1 step from mean" model | Detect existing 1→0 transition only (which already triggers automatically) | Existing algorithm already handles drift implicitly. Richer model = v1.1 follow-up. |
| #60 | Calibration history sparkline | Dropped | Issue marks it "v1.1 if scope tight." |

If Emiel disagrees with any of these, surface before implementation.
