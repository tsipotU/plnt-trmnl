# Phase 3 — Plant Detail rebuild plan

**Date:** 2026-05-01
**Status:** Approved — building.
**Source page:** `packages/api/client/src/pages/PlantDetail.tsx` (2,025 lines)
**Target route:** `/plants/:id` (unchanged)

This plan was reviewed and approved before any rebuild work began. The five
open questions at the bottom were each answered explicitly; those answers are
folded into the plan body below as the resolved decisions.

---

## 1 · Existing PlantDetail.tsx inventory

15 pieces of local state: `plant`, `conditions`, `events`, `catalogEntry`,
`showAllCatalogConditions`, `pickerOpen`, `loading`, `error`, `toast`,
`undoToast`, `confirmRepot`, `otherCmDraft`, `confirmArchive`,
`conditionsHelpDismissed`, `devInfoExpanded`, `renamingSpecies`,
`speciesDraft`.

API endpoints used (all preserved through the rebuild):

- `GET /api/plants/:id`
- `GET /api/plants/:id/conditions`
- `GET /api/plants/:id/events`
- `GET /api/catalog/entry?species=...`
- `PUT /api/plants/:id` (partial: name, species, identifier, location,
  pot_size_cm, pot_size_category, light_level, origin_type, origin_source,
  plant_size)
- `POST /api/plants/:id/water` · `POST /api/plants/:id/undo-water`
- `POST /api/plants/:id/conditions` · `POST /api/conditions/:id/resolve`
- `POST /api/plants/:id/archive`

### Sections in render order

| # | Section | Data source | Prototype equivalent? |
|---|---|---|---|
| A | Header (← Dashboard) | inline | BackBar |
| B | Still-enriching banner (2 variants: connected vs not) | location.state, useAiConnection | Banner (info or warn) |
| C | Hero illustration (16/9 aspect) | plant.illustration_path | m-detail-hero (left thumbnail) |
| D | **Duplicate hero card** (#134 — second image) | plant.illustration_path | (bug — collapse) |
| E | Plant name + species (rename flow) + identifier | plant + EditableField + speciesDraft | m-detail-hero (right block) |
| F | 2-col info grid (Location, Pot, Light, Origin, Plant size, Interval, Next watering) | plant + EditableSelect + EditableField | m-detail-data + m-section-head "Properties" |
| G | "Watered" big primary button | handleWater | m-actions (paired with Mist) |
| H | Conditions card (help banner + + Add + active list with Resolve) | conditions + ConditionsPicker | m-section-head "Conditions" + m-cond rows |
| I | About this plant (AboutCard, collapsible) | plant.about | m-section-head "About this plant" + m-card |
| J | Light mismatch warning (alert) | catalogEntry.light_profile.ideal vs plant.light_level | Banner warn |
| K | Catalog Light section (Ideal, Tolerance, Direct sun, Too little, Too much) | catalogEntry.light_profile | (no direct equivalent — existing-only) |
| L | Catalog Placement section (tips list) | catalogEntry.placement_tips | (no direct equivalent — existing-only) |
| M | Catalog Common conditions (top 5 / all toggle, ConditionCard with Flag button) | catalogEntry.conditions | (no direct equivalent — existing-only) |
| N | Health overview (4 stats + Calibration trend arrow) | events + plant | (no direct equivalent — existing-only) |
| O | History (CollapsibleSection event timeline) | events | m-section-head "Care log" + m-log-entry |
| P | Notes log (separate component) | NotesLog | (no direct equivalent — existing-only) |
| Q | Developer info (devInfoEnabled gated, collapsible) | plant + events | (no direct equivalent — existing-only) |
| R | Archive plant button (danger outline) | confirmArchive | m-section-head "Danger zone" + m-btn danger |
| — | ConfirmDialog (repot confirmation) | confirmRepot | (replace with Sheet) |
| — | ArchiveDialog (separate component) | confirmArchive | ArchiveModal (Sheet + RadioRow per prototype) |
| — | ConditionsPicker (separate component) | pickerOpen | ConditionsModal (Sheet + Tabs per prototype) |
| — | Toast / UndoToast | toast / undoToast | Toast molecule |

---

## 2 · Prototype Plant detail composition

In render order:

```
1.  BackBar              ← Back · {location} · ⊘ archive
2.  Banner (warn)        Enrichment pending — Connect AI →    [conditional]
3.  Banner (info)        ✈️ On vacation                       [conditional]
4.  Banner (warn)        ⚠ Light mismatch                     [conditional]
5.  Hero block           Pictogram + name + species + identifier + common + state pill
6.  DetailDataGrid       Last watered · Next water · Cycle · Pot · Light · Calibration  (read-only)
7.  Two-button row       Water (highlight) | Mist (ghost)     [done state when complete]
8.  QuickActionRow       Feed · Prune · Repot · Photo · Note  (5 columns)
9.  SectionHead          Conditions ({n})  · "+ Add" chip
10. ConditionRow list    severity + name + symptoms + remedy + Resolve
11. SectionHead          Calibration
12. InfoCard             Watering rhythm narrative (dialed in / starting / cycle N of ~5)
13. SectionHead          Progress photos ({n}) · "+ Add" chip
14. PhotoStrip           Add cell + image cells
15. SectionHead          About this plant  (collapsible)
16. InfoCard             Also known as / In Dutch / Origin / Toxicity / Lore
17. SectionHead          Properties
18. DetailDataGrid       Location · Light · Pot category · Origin  (editable)
19. SectionHead          Vacation mode
20. SettingsRow          On vacation/At home + Toggle
21. SectionHead          Care log · "{N} entries"
22. CareLogEntry list    date · type · note
23. SectionHead          Danger zone
24. Button (destructive) Archive plant
25. Modals (Sheet-based) CalibrationModal · ConditionsModal · NoteModal · PhotoModal · ArchiveModal
```

---

## 3 · Reconciliation — section-by-section mapping

### Direct catalog mappings (no behavior change)

| Existing | New composition |
|---|---|
| Header A | `BackBar` (eyebrow=location, action=archive icon) |
| Banner B | `Banner` atom (info/warn variants) |
| Hero C+D **(collapse the duplicate)** + name/species/identifier from E | Hero block: page-local `PlantDetailHero` with `Pictogram` + `EditableField` (name) + species rename flow + `RowState` pill |
| Info grid F | Two `DetailDataGrid` blocks: read-only header grid (#6 in prototype) and editable Properties grid (#18) — splits the existing single grid by intent |
| Watered button G + Mist (placeholder) | Two-button row using `Button highlight` + `Button secondary` |
| Conditions H | `SectionHead` "Conditions" + `ConditionRow` list + Sheet-based ConditionsModal |
| AboutCard I | `SectionHead` "About this plant" (collapsible) + `InfoCard` body |
| Light mismatch J | `Banner warn` (move position to top per prototype #4) |
| History O | `SectionHead` "Care log" + `CareLogEntry` list |
| Archive button R | `SectionHead` "Danger zone" + `Button destructive fullWidth` |

### Existing-only sections — all kept (decision 1)

> The prototype is the visual spec, the existing app is the feature spec.
> Render existing features through the visual spec. Don't delete features
> to match a prototype that didn't know they existed.

| Section | Where it goes |
|---|---|
| K — Catalog Light section | After Calibration: `SectionHead` "Light profile" + `InfoCard` |
| L — Catalog Placement | After Light profile: `SectionHead` "Placement" + `InfoCard` with bulleted tips |
| M — Catalog Common conditions | After Conditions section as a sub-block (top 5 by default, "Show all" toggle preserved) |
| N — Health overview | After Care log: `SectionHead` "Health" + `StatRow` + `InfoCard` for trend arrow |
| P — Notes log | Folding decision pending — see §4 below |
| Q — Developer info | Last section before Danger zone: `SectionHead` "Developer info" + collapsible `InfoCard` with grid |

### Prototype features — partial ship per decision 2

> Placeholder buttons feel like real buttons (correct hover/active), not
> greyed out. Toast on tap.

| Prototype feature | Decision | Implementation |
|---|---|---|
| Mist (2nd primary action) | Placeholder | Live `<Button secondary>` with hover/active; tap fires "Coming in a future wave" toast |
| Feed (QuickAction) | Placeholder | Same pattern as Mist |
| Prune (QuickAction) | Placeholder | Same |
| Repot (QuickAction) | **Wired** | Triggers existing pot-size flow via the Properties grid (or opens a Sheet asking which pot size, deferred to flow-design). At minimum, taps scroll to / focus the Pot category select. |
| Photo (QuickAction) | Placeholder | Tap fires "Photos in a future wave" toast |
| Note (QuickAction) | **Wired** | Opens the new Sheet-based NoteModal |
| Vacation banner / Vacation toggle | **Defer entirely** | No per-plant vacation flag; same data gap as Plants list filter (#148) |
| Photo strip | **Defer** — render section with EmptyState "Photos in a future wave" | No upload endpoint, no storage layer |
| Calibration "Preview question" → CalibrationModal | **Ship** | Routes to existing `CalibrationModal` logic |

### Modal strategy — replace all three (decision 3)

> Replace ConfirmDialog (repot), ArchiveDialog, ConditionsPicker with Sheet-
> based modals. Delete old component files in the same PR.

| Existing | Replace with |
|---|---|
| `ConfirmDialog` (repot) | `Sheet` + `RadioRow` (Yes repotted / No just updating) — delete `ConfirmDialog` |
| `ArchiveDialog` | `Sheet` + `RadioRow` list (4 reasons) + `<textarea>` + footer Cancel/Archive — delete `ArchiveDialog` |
| `ConditionsPicker` | `Sheet` + `Tabs` (Common/Custom) + `ConditionRow` list / FieldLabel+input — delete `ConditionsPicker` |
| (new) NoteModal | `Sheet` + `<textarea>` + footer Cancel/Save — replaces `NotesLog`'s inline note-entry editor (the log itself stays) |
| (new) PhotoModal | `Sheet` + `EmptyState` "Photos in a future wave" + close button — placeholder until upload lands |

### Editable fields strategy — composition (decision: α)

`DataCell` has a visual `editable` flag (dashed underline + cursor:text) but
no editing logic. Compose: `<DataCell editable label="Light" value={<EditableSelect ... />} />`.
EditableField and EditableSelect stay as page-level inline-edit components
that render inside `DataCell.value`. No molecule-layer churn.

### Hero block — page-local, named `PlantDetailHero`

> PlantDetailHero stays page-local. Memorial rebuild PR will tell us if it
> earns promotion. (Structural note B.)

Renders:
- Illustration if `plant.illustration_path`, else `<Pictogram name="leaf" size={96} />` (category-specific later)
- Inline name editor (existing `EditableField`)
- Species rename flow (existing logic, replaces lines 1090–1186 of current PlantDetail.tsx)
- Identifier subline (existing `EditableField`)
- Common name subline (read-only)
- State pill via `<RowState>` driven by `plantView.plantState`

This collapses the existing C + D + E sections (three vertical cards) into
one horizontal block per prototype.

---

## 4 · NotesLog — fold or keep? (decision 4)

> Fold into Care log if data model fits as a `CareLogEntry` variant.
> If notes have richer structure that doesn't fit cleanly, keep separate
> and flag it. Verify before deciding.

**Verification step before any rendering work:** read `NotesLog.tsx`, check
`/api/plants/:id/notes` (if it exists) vs `/api/plants/:id/events`, decide.

If notes are care-log events: fold the rendering into the unified Care log
section, replace the standalone `<NotesLog />` mount with a single
`SectionHead "Care log"` + interleaved `CareLogEntry` rows. Note creation
flows through the new `NoteModal` Sheet, which POSTs to whichever endpoint
exists.

If notes have a separate schema (their own ID space, attachments,
edit-in-place, anything richer): keep `NotesLog` as a sibling section under
`SectionHead "Notes"`, write up the gap in the rebuild commit message, and
file a follow-up issue to plan the unification.

---

## 5 · Behavior preservation list (must work after rebuild)

- ✅ Water → log event → undo toast (15s) → undo restores prior state
- ✅ Conditions: add (catalog or generic or custom) → POST → list updates → resolve → DELETE-flag
- ✅ Repot flow: pot size change → confirm Sheet → "Yes repotted" logs repot event, "No" just updates the field
- ✅ "Other" pot size → inline cm input → confirm
- ✅ Species rename → PUT /api/plants/:id → server-side re-enrichment kicks in
- ✅ Inline edit: name, identifier, location, light_level, origin_type, origin_source, plant_size
- ✅ Light mismatch warning when catalog ideal ≠ plant.light_level
- ✅ Catalog-driven sections (Light profile, Placement, Common conditions w/ Flag)
- ✅ Health overview stats + calibration trend arrow
- ✅ Care log timeline (events with icons, capitalized labels, before→after diffs)
- ✅ Notes (standalone or folded — TBD per §4)
- ✅ Developer info (devInfoEnabled gated, collapsible)
- ✅ Archive flow: Sheet with reason + note → POST → navigate to /archive/:id
- ✅ "Still enriching" hint banner on first-plant landing
- ✅ first-plant celebration toast
- ✅ Auto-redirect to /archive/:id if `plant.archived === 1`

---

## 6 · Tests

Existing `PlantDetail.test.tsx` is **35 KB / ~900 lines**. Most tests verify
behavior. Rebuild aims to keep all behavior tests passing with minimal
updates — text changes ("Dashboard" → BackBar variant) and DOM-structure
shifts where necessary.

New tests:
- Hero collapse: only one hero image rendered
- ConditionsModal renders when "+ Add condition" tapped
- ArchiveModal Sheet renders when archive tapped
- Repot confirmation Sheet (not ConfirmDialog) renders

---

## 7 · Out of scope (explicit)

- TopBar / Tabs / Drawer chrome — that's an App-shell rebuild, separate concern
- Mist endpoint, Feed/Prune endpoints, Photo upload — backend gaps deferred to issues
- Vacation per-plant flag — same as #148 deferred
- Touching `App.tsx` `<main>` padding — still using the `margin: -16` workaround

---

## 8 · Structural notes

### A. PR-split rule

If the PR runs over **~1,800 net lines added**, split:

- **PR-3a:** page rebuild + behavior preservation (BackBar, banners, hero
  collapse, data grids, sections, QuickActionRow). Keep existing dialogs
  in place during PR-3a so behavior stays green.
- **PR-3b:** modal replacements (ConfirmDialog → repot Sheet, ArchiveDialog →
  archive Sheet, ConditionsPicker → conditions Sheet). Delete old files.

Decision point is at the modal work — when staring at the size, call it.

### B. PlantDetailHero promotion gate

Page-local for this PR. Memorial rebuild will tell us if it earns
promotion to a molecule. If Memorial uses the same horizontal-pictogram-+-
text-block pattern, promote then.

### C. This document

Saved before any code work, per request. Reviewable history, not chat-only.

---

## 9 · Open questions — all resolved

The five open questions at plan-review time and their answers:

1. **Catalog cards (Light profile / Placement / Common conditions) — keep all three?**
   → **Yes.** Existing app is the feature spec; render through the visual spec.

2. **QuickActionRow — defer all 5, or ship row with partial functionality?**
   → **Ship partial.** Repot wires to existing flow, Note wires to NoteModal,
   Feed/Prune/Photo show "Coming soon" toast. Buttons live, not greyed.

3. **Replace existing dialogs with Sheet-based modals, or leave them?**
   → **Replace all three.** Delete old component files in the same PR.

4. **NotesLog — keep standalone or fold into Care log?**
   → **Fold if data model fits.** Verify before deciding.

5. **PR size estimate — fine?**
   → **Fine, with split rule (note A).**
