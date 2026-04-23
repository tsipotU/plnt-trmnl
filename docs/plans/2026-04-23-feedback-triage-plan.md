# Feedback Triage Plan — 2026-04-23

## Source

22 feedback items (rows 2-23) submitted to plant-trmnl's feedback system
between 10:46 and 11:51 on 2026-04-23 by Emiel (product). Stored in
`plant-trmnl.db` table `feedback`. Source of truth — nothing else.

## Outcome

- **20 new GitHub issues** across Waves 4, 5, 6
- **1 comment on existing issue #32** (FB #19 is duplicate)
- **2 cross-reference mentions** on #56 and #58 (embedded in W5-5's body)

## Dispatch instructions for executor agent

You are creating GitHub issues on the `tsipotU/plant-trmnl` repo.

1. For each section below marked `### Wave-N-M`, do this:
   a. Write the "Body" content (everything between the `---BODY---` and
      `---ENDBODY---` lines) to `/tmp/plnt-issue-body.md` (overwrite each
      time).
   b. Run:
      ```
      cd ~/Projects/plant-trmnl && gh issue create \
        --title "<Title>" \
        --body-file /tmp/plnt-issue-body.md \
        --label "<comma-separated labels>"
      ```
   c. Record the returned issue number.
2. After all 20 issues created, post the comment at the bottom of this
   file (section `COMMENT-32`) to issue #32 via:
   `gh issue comment 32 --body-file /tmp/plnt-comment-32.md`
3. Return a mapping: `W4-1 → #<num>, W4-2 → #<num>, ..., W6-4 → #<num>`.

**Do not:**
- Modify this plan file
- Create more issues than listed
- Add labels beyond those specified
- Add signature/footer text to bodies

**Stop on first failure** and report which step.

---

## Wave 4 — Polish, bugs, E2E

### Wave-4-1 — Date ribbon: make cards clickable to jump to that day

**Labels:** `enhancement,client,ux`

**Origin:** Feedback DB row #6

---BODY---
## Context

Issue #12 (shipped Wave 3) added a 7-day calendar strip above the
dashboard — cards showing each day of the week with the count of plants
to water. The cards are decorative: tapping them does nothing. User
feedback: "I don't understand the ribbon with the dates. You can't
click them, they show nothing. What do they do?"

## Impact

- **User:** Real estate on the dashboard is taken by a feature with no
  discoverable function. Users assume it's broken or half-finished.
- **Product:** A passive ribbon trains users to ignore the top of the
  screen. A clickable one turns it into a navigation primitive.

## Definition of Done

- [ ] Tapping a day card filters/scrolls the dashboard to show only
  plants scheduled for that day
- [ ] Today's card is visually distinguishable and selected by default
- [ ] Tapping the selected day again clears the filter (back to "all
  upcoming")
- [ ] Each card shows the count of plants due that day (already partly
  there; verify)
- [ ] Empty-day cards are visually dimmed (no plants due)
- [ ] Works on mobile (touch target ≥ 44px per card)

## Gherkin

```gherkin
Feature: Date ribbon navigation
  As a user with multiple plants on varied watering schedules
  I want to jump to the plants due on a specific day
  So I can see at a glance what that day will look like

  Background:
    Given I have 3 plants due today, 1 due tomorrow, 0 due on Thursday

  Scenario: Filter by tapping a day card
    Given I am on the dashboard
    When I tap the "Tomorrow" card
    Then I see only the 1 plant due tomorrow
    And the "Tomorrow" card is visually selected

  Scenario: Clear filter by tapping selected card again
    Given I have tapped "Tomorrow" and see one plant
    When I tap "Tomorrow" again
    Then I see all 4 upcoming plants
    And no card is visually selected

  Scenario: Empty day card is dimmed
    Given Thursday has no plants due
    Then the "Thursday" card appears dimmed/muted
    And tapping it shows an empty state, not an error
```

## Cross-links

Builds on #12 (shipped). Related: #40 (frontend design pass).

Origin: feedback DB row 6 — 2026-04-23.
---ENDBODY---

### Wave-4-2 — Rename "Plant name" field to "Plant species or type"

**Labels:** `enhancement,client,ux`

**Origin:** Feedback DB row #7

---BODY---
## Context

The AddPlant form asks for a "Plant name" as the primary input. Users
interpret this as "the name I give my individual plant" (e.g., "Pieter")
rather than "the species" (e.g., "Monstera deliciosa"). The downstream
enrichment expects a species/sort and fails when given a person-name.

Issue #10 (shipped) added an optional "identifier" field for the
personal name path. The primary field should therefore ask clearly for
the species/kind, not a name.

## Impact

- **User:** Lower friction in onboarding — no ambiguity about what to
  type. Fewer enrichment misses from "Pieter" / "Green One" / etc.
- **Product:** Cleaner telemetry on the primary input — it's actually
  species data, not mixed labels.

## Definition of Done

- [ ] Primary label on the name input changed to "Plant species or type"
  (or similar — pick final wording)
- [ ] Placeholder text gives an example: e.g. "Monstera, Ficus, Pothos"
- [ ] The existing "identifier" field (#10) retains its current label
  for personal names
- [ ] Sub-label or tooltip clarifies: "If you want to give this plant a
  personal name, use the Identifier field below"

## Gherkin

```gherkin
Feature: Clear labeling of species input
  As a new user adding their first plant
  I want the form to tell me it wants a species, not a nickname
  So I don't have to guess and get bad care data

  Scenario: Primary field labels what it wants
    Given I am on the AddPlant page
    Then the main input is labeled "Plant species or type"
    And the placeholder shows "Monstera, Ficus, Pothos"
    And the identifier field below is labeled for personal name
```

## Cross-links

Related: #2 (streamlined add-plant flow), #10 (shipped identifier).

Origin: feedback DB row 7 — 2026-04-23.
---ENDBODY---

### Wave-4-3 — AddPlant form: optional info block no longer jumps when last-watered changes

**Labels:** `bug,client,ux`

**Origin:** Feedback DB row #8

---BODY---
## Context

On the AddPlant page, switching the "When did you last water?"
selector between `today` / `pick a date` / `don't know` causes the
optional-info block below to shift vertically. The shift happens
because the date picker only renders under the `pick` option — so the
rest of the form reflows each time.

User feedback: "When interacting with the last watered module, the
rest should not bounce all over the place."

## Impact

- **User:** Form feels unstable. Jitter interrupts cognitive flow
  while filling in the form.
- **Product:** Small polish item, but the kind of thing that
  accumulates into "feels unfinished."

## Definition of Done

- [ ] The form's vertical layout is stable across all three
  `wateredWhen` states
- [ ] The date picker's space is reserved even when hidden (or the
  picker appears inside a fixed-height slot)
- [ ] Visual regression: screenshots before/after confirm no shift on
  state change

## Cross-links

File: `packages/api/client/src/pages/AddPlant.tsx`.

Origin: feedback DB row 8 — 2026-04-23.
---ENDBODY---

### Wave-4-4 — Pot size: drop numeric input and "Other", add XXL 50-100cm

**Labels:** `enhancement,client,ux`

**Origin:** Feedback DB row #10

---BODY---
## Context

Issue #31 (shipped Wave 3) replaced raw numeric pot-size entry with
named categories (XS / S / M / L / XL / Other). But the form still
shows a separate numeric cm input alongside the dropdown, with the
browser's default `type="number"` spinner arrows. User feedback: "In
pot size, remove the arrows, people should put in a number… but the
up-down arrows are a no go."

On discussion: the right answer is to remove the numeric field
entirely. Precision rarely matters for watering math at these
resolutions. The only edge case was pots larger than 50cm — covered
by adding an XXL bracket.

## Impact

- **User:** Single, frictionless pot-size question. No rulers. No
  arrows.
- **Product:** Finishes what #31 started — one mechanism, not two.

## Definition of Done

- [ ] Numeric `potSizeCm` input removed from AddPlant form
- [ ] `Other` option removed from pot-size dropdown
- [ ] New option added: "Extra Extra Large (50–100 cm)" → representative
  cm value around 70
- [ ] Dropdown ordering: XS, S, M, L, XL, XXL
- [ ] Tests updated: ensure no test path relies on typing a cm number
- [ ] DB: POST /api/plants still accepts `pot_size_category` only;
  `pot_size_cm` derived server-side from category mapping (or client
  sends the category-representative cm — pick one, document)
- [ ] Existing plants in the DB retain whatever `pot_size_cm` they have
  (migration not required)

## Gherkin

```gherkin
Feature: Simple pot-size selection
  As a user adding a plant
  I want to pick a size bucket without measuring
  So I'm not asked to find a ruler

  Scenario: Dropdown is the only pot-size input
    Given I am on AddPlant
    Then the pot-size UI is a single dropdown with 6 options
    And the options are XS, S, M, L, XL, XXL
    And there is no separate cm number field
    And there is no "Other" option

  Scenario: XXL covers oversized pots
    Given I pick "XXL (50–100 cm)"
    When I submit the form
    Then the plant is created with the XXL category
```

## Cross-links

Builds on #31 (closed).

Origin: feedback DB row 10 — 2026-04-23.
---ENDBODY---

### Wave-4-5 — Timeline: hide raw enrichment debug line, replace with "✓ Care profile added"

**Labels:** `bug,client,ux`

**Origin:** Feedback DB row #14

---BODY---
## Context

On the plant detail page, the History/Timeline shows raw enrichment
debug output:

```
enrichment complete
Claude enrichment: Euphorbia leuconeura
→ interval=10, ratio=0.025
```

This is audit data masquerading as a user-facing event. The arrow
line (`→ interval=10, ratio=0.025`) exposes the internals of the
calibration system.

Issue #25 (shipped Wave 3) already handled the equivalent problem for
`water` events. This extends the same hiding to `enrichment_*` events.

## Impact

- **User:** Timeline reads as a plant story, not a log of system
  internals.
- **Product:** Matches #25's direction — we already decided audit
  data doesn't belong in the user timeline.

## Definition of Done

- [ ] Enrichment events render as a single line: "✓ Care profile
  added" with the enriched species name below (small, secondary
  color)
- [ ] Raw `interval=N, ratio=X` line is never rendered in the user
  timeline
- [ ] The raw data is still stored in the event log (audit trail
  preserved)
- [ ] Test coverage for timeline rendering of enrichment events

## Gherkin

```gherkin
Feature: Clean enrichment timeline entries
  As a user reading my plant's history
  I want to see when care info was added, not the mechanics of how

  Scenario: Enrichment event shows as a single clean line
    Given a plant has been enriched with species "Euphorbia leuconeura"
    When I view the plant's timeline
    Then I see an entry "✓ Care profile added"
    And I see the species name "Euphorbia leuconeura" as a secondary line
    And I do not see "→ interval=10" or "ratio=0.025" anywhere
```

## Cross-links

Pattern: matches #25 (closed). See also W5-5 for the expanded
enrichment-visibility story.

Origin: feedback DB row 14 — 2026-04-23.
---ENDBODY---

### Wave-4-6 — Explain what "active conditions" are on plant detail page

**Labels:** `enhancement,client,ux`

**Origin:** Feedback DB row #17

---BODY---
## Context

The plant detail page shows an "Active Conditions" section. The term
is domain-specific (root rot, pest infestation, overwatering, etc.)
and unexplained. User feedback: "We should tell the user what
'conditions' mean — for instance, if there is something wrong with
the plant, plnt-trmnl helps them take care of the plant and make it
better."

## Impact

- **User:** One-sentence definition removes ambiguity. New users
  understand the feature on first encounter.
- **Product:** Reinforces plant-trmnl's core value prop (helping plants
  recover, not just reminding to water).

## Definition of Done

- [ ] A small `?` icon next to the "Active Conditions" heading
- [ ] Tapping shows a one-sentence explanation: "Conditions are
  problems affecting your plant — things like root rot, leaf yellowing,
  or pest infestations. When flagged, plnt-trmnl suggests how to
  address them."
- [ ] Dismissible; does not re-show once dismissed (localStorage flag
  is acceptable)
- [ ] Empty state ("No active conditions") shows a friendly message
  referencing the same explanation

## Cross-links

Related: W5-6 (Conditions editing), #34 (condition remediation).

Origin: feedback DB row 17 — 2026-04-23.
---ENDBODY---

### Wave-4-7 — Watered toast: shorten from 15s to 7s, fix undo button text alignment

**Labels:** `enhancement,client,ux`

**Origin:** Feedback DB row #18

---BODY---
## Context

Two small items bundled:

1. The "Watered!" confirmation toast stays visible for 15 seconds
   (set by issue #26 in Wave 3). User feedback: 15s is too long; 7s
   + a 1-second fadeout feels right.
2. The Undo button's text label inside that toast is not vertically
   centered.

## Impact

- **User:** Faster return to a clean screen. Polished undo button.
- **Product:** 8-second difference is noticeable in demo flows and
  screen-recordings.

## Definition of Done

- [ ] Toast visible duration: 7 seconds
- [ ] Fadeout animation: 1 second
- [ ] Undo button label is vertically and horizontally centered
- [ ] The 7-second window still allows successful undo throughout

## Cross-links

Modifies timing from #26 (closed Wave 3).

Origin: feedback DB row 18 — 2026-04-23.
---ENDBODY---

### Wave-4-8 — Archive dialog: style radio inputs themselves, not just surroundings

**Labels:** `bug,client,ux`

**Origin:** Feedback DB row #21

---BODY---
## Context

Issue #29 (shipped Wave 3) styled the archive dialog's layout — rows,
padding, disabled states. But the `<input type="radio">` elements
themselves fall back to native browser rendering. On iOS Safari, this
appears as large oval shapes rather than classic circles. User
feedback: "I see big ovals where radio buttons should be. They are
very ugly."

## Impact

- **User:** The dialog is the death-screen for a plant. Polish matters
  emotionally; ugly radios trivialize the moment.
- **Product:** iOS Safari is a primary target (mobile web) — not
  addressing native radio appearance misses our main rendering target.

## Definition of Done

- [ ] Custom-styled radio indicators that render consistently across
  Safari iOS, Chrome Android, and desktop browsers
- [ ] Styles match the design system (`--accent` for selected, neutral
  for unselected)
- [ ] Keyboard accessibility preserved (space toggles, focus ring
  visible)
- [ ] Screen-reader semantics preserved (still labeled radios)

## Cross-links

Extends #29 (closed).

File: `packages/api/client/src/components/ArchiveDialog.tsx`.

Origin: feedback DB row 21 — 2026-04-23.
---ENDBODY---

### Wave-4-9 — Archive popup z-index: no longer obfuscates the "Leave feedback" FAB

**Labels:** `bug,client,ux`

**Origin:** Feedback DB row #23

---BODY---
## Context

When the archive confirmation popup opens, the floating "Leave
feedback" button (FAB) is hidden behind it. User feedback: "The pop
up obfuscated the leave feedback button."

This blocks users from reporting bugs in the archive flow — the most
error-prone flow in the app.

## Impact

- **User:** Can always reach feedback, including during a problem.
- **Product:** Increases feedback funnel coverage for the trickiest
  interaction.

## Definition of Done

- [ ] The feedback FAB remains visible and tappable when the archive
  dialog is open
- [ ] Decision: either (a) temporarily hide the FAB while the dialog
  is open (simplest), or (b) ensure the FAB sits above the overlay
  with proper z-index
- [ ] If (a): the FAB reappears instantly on dialog close

Default recommendation: (a) — hide the FAB during the dialog. A
modal is meant to grab full attention; the user can submit feedback
after closing it.

## Cross-links

Related: W4-8 (same dialog).

Origin: feedback DB row 23 — 2026-04-23.
---ENDBODY---

---

## Wave 5 — Catalog, intelligence, add-plant flow

### Wave-5-1 — Last-watered "don't know" → ask soil-feel to seed calibration

**Labels:** `enhancement,client,scheduling,care-data`

**Origin:** Feedback DB row #9

---BODY---
## Context

On AddPlant, the "When did you last water?" selector offers `today`,
`pick a date`, `don't know`. The current behavior when users pick
`don't know` is to default to "yesterday" — a silent guess.

User feedback: "When selecting 'don't know' we should ask how the
soil feels (dropdown) — and take this into account for the watering
calibration since we are adding a new plant."

## Impact

- **User:** Honest about uncertainty, useful signal captured instead
  of a silent default.
- **Product:** Feeds calibration with a real initial data point,
  improving the first interval for the plant — core to the calibration
  value prop.

## Definition of Done

- [ ] Selecting "don't know" reveals a soil-feel dropdown:
  - Bone dry
  - Dry
  - Slightly moist
  - Moist
  - Wet
- [ ] Selection is required before form submission (the "don't know"
  path becomes a two-step micro-flow)
- [ ] Server-side: the soil-feel value seeds the initial
  `calibration_cycle` state for that plant
- [ ] The first calibration question for this plant is skipped on
  its first watering (we already know the current soil state)
- [ ] Event logged: `calibration_seeded` with the soil-feel value as
  metadata

## Gherkin

```gherkin
Feature: Soil-feel fallback for unknown watering date
  As a user who doesn't remember when I last watered
  I want to answer a soil-feel question instead of guessing a date
  So the calibration starts with a real signal

  Scenario: "Don't know" reveals soil-feel dropdown
    Given I am on AddPlant with the form partly filled
    When I select "don't know" as the last-watered option
    Then a "How does the soil feel?" dropdown appears
    And the dropdown has 5 moisture options

  Scenario: Cannot submit without soil-feel
    Given I selected "don't know" and haven't picked a soil-feel
    When I try to submit
    Then the form highlights the soil-feel field
    And the plant is not created

  Scenario: Soil-feel seeds calibration
    Given I select "don't know" + "Dry"
    When I submit the form
    Then the plant is created
    And the calibration initial state reflects "Dry"
    And the first upcoming watering does not trigger a calibration
    question (we already have that data)
```

## Cross-links

Related: #60 (calibration UX), #36 (dry-soil-aware calibration
rethink).

Origin: feedback DB row 9 — 2026-04-23.
---ENDBODY---

### Wave-5-2 — Help text: explain what "low / medium / bright" light mean

**Labels:** `enhancement,client,ux,care-data`

**Origin:** Feedback DB row #11

---BODY---
## Context

The AddPlant form asks for "Light level" with options like low /
medium / bright. Users without horticultural background can't map these
to their actual rooms. User feedback: "Low light means what, what is
bright, how do we gauge them? If they know how to gauge them, they can
fill it in."

## Impact

- **User:** Confident answer on a question that directly affects care
  recommendations.
- **Product:** Better data in → better enrichment out → better schedules.

## Definition of Done

- [ ] A help icon next to the Light Level label
- [ ] Tapping it shows a concise guide with 3 rows (low / medium /
  bright), each with:
  - Concrete example ("North-facing window, back of the room" vs
    "East/west window, near the glass" vs "South-facing window, direct
    sun hours")
  - Can-you-read test ("Can you read a book comfortably at noon
    without artificial light?" = medium minimum)
- [ ] Dismissible
- [ ] Works offline / doesn't require catalog #1 to land

## Cross-links

Related: #2 (streamlined add-plant flow), #3 (rich care profiles).

Origin: feedback DB row 11 — 2026-04-23.
---ENDBODY---

### Wave-5-3 — Post-add enrichment splash: confirm species, preview care profile

**Labels:** `enhancement,client,care-data,ux`

**Origin:** Feedback DB row #12

---BODY---
## Context

After adding a plant, the user lands directly on the plant detail
page. Enrichment runs in the background; its results appear without
explicit confirmation. User feedback: "After adding a plant, we should
have a confirmation screen — that finds the plant in the database.
'You said sanseveria, we think you mean Sansevieria' — is that
correct?"

The bigger vision: a splash screen shows the enrichment result
(species name, key care data, image) and asks the user to confirm or
correct before landing on the plant detail page.

## Impact

- **User:** Catches misidentifications immediately (especially
  Sansevieria/Sanseveria type slips).
- **Product:** Significantly increases trust in the enrichment pipeline
  — users see it working, not just the silent result.
- **Differentiator:** This is the kind of AI-transparency moment that
  makes "AI-powered" feel considered, not magical.

## Definition of Done

- [ ] After POST /api/plants returns, the client shows a splash
  (full-screen or modal) — not yet the plant detail page
- [ ] The splash waits for enrichment to complete (timeout with
  fallback path: if enrichment takes >10s, land on plant detail
  with a "still enriching" badge)
- [ ] Splash content on success:
  - "We found: <Enriched species name>" (prominent)
  - The TRMNL card image for that species (if available)
  - Summary of care: light, water frequency, placement hint
  - "Looks right" → navigate to plant detail
  - "Not quite" → allow user to type a correction (free text),
    which triggers re-enrichment with the corrected input
- [ ] Splash content on failure (species not recognized):
  - See W5-4 (Enrichment fallback) — triggers that path

## Gherkin

```gherkin
Feature: Enrichment splash confirms species match
  As a user just after adding a plant
  I want to see what the system thinks my plant is
  So I can correct misidentifications before committing

  Scenario: Successful enrichment shown in splash
    Given I type "sanseveria" and submit the form
    And enrichment completes as "Sansevieria trifasciata"
    Then I see a splash with "We found: Sansevieria trifasciata"
    And I see a preview image
    And I see summary care data (light, water frequency, placement)
    And I see options "Looks right" and "Not quite"

  Scenario: User confirms the match
    Given I am on the splash with a successful match
    When I tap "Looks right"
    Then I land on the plant detail page for that plant

  Scenario: User disputes the match
    Given I am on the splash with a match the user disputes
    When I tap "Not quite"
    Then I can type a correction
    When I submit the correction
    Then enrichment runs again with the new input
    And I return to the splash with the new result

  Scenario: Enrichment timeout
    Given enrichment does not complete within 10 seconds
    Then the splash dismisses automatically
    And I land on the plant detail page
    And a badge shows "Still enriching — check back shortly"
```

## Cross-links

Related to but does NOT include: fuzzy/did-you-mean path — see #39 (that
issue covers the "not recognized at all" fallback flow). This issue
covers the SUCCESS path.

Also related: W5-4 (fallback splash), W5-5 (enrichment visibility).

Origin: feedback DB row 12 — 2026-04-23.
---ENDBODY---

### Wave-5-4 — AddPlant: optional fields become mandatory, with asterisks

**Labels:** `enhancement,client,ux`

**Origin:** Feedback DB row #13

---BODY---
## Context

The AddPlant form labels several fields as "Optional" — light level,
pot size, location. User feedback: "I don't think the optional info we
ask for should be optional. We need the info to keep a good database."

## Impact

- **User:** Small extra effort; the tradeoff is the plant actually
  gets accurate care (optional data is often the signal that makes
  enrichment useful).
- **Product:** Dataset quality — every plant has complete scoping data.
  Enrichment accuracy rises.

## Definition of Done

- [ ] Fields previously labeled "Optional" become required:
  - Light level
  - Pot size (category — see W4-4)
  - Location (still a free text field, but required)
- [ ] Required fields have an asterisk `*` adjacent to the label
- [ ] The word "Optional" is removed from the form
- [ ] Form validation: submit is disabled until all required fields
  are filled
- [ ] Clear error state if the user tries to submit an incomplete form

## Gherkin

```gherkin
Feature: Required fields for complete plant scoping
  As a product owner keeping care data accurate
  I want users to complete all scoping fields
  So enrichment has useful inputs

  Scenario: Submit blocked on incomplete form
    Given I am on AddPlant and have typed only the species
    Then the submit button is disabled
    And all required fields show asterisks

  Scenario: All required fields filled
    Given I have filled species, pot size, light level, location
    Then the submit button becomes enabled
    When I submit the form
    Then the plant is created
```

## Cross-links

Related: #2 (streamlined add-plant flow), W4-4 (pot size refactor).

Origin: feedback DB row 13 — 2026-04-23.
---ENDBODY---

### Wave-5-5 — Enrichment visibility: prominent species name + optional dev-info toggle

**Labels:** `enhancement,client,care-data,ux`

**Origin:** Feedback DB rows #14 and #15 (consolidated)

---BODY---
## Context

User feedback combined two signals:

1. "No idea if the plant was found in the database or enriched via an
   API call" — plant detail page doesn't surface enrichment state
2. "History had code in it" — raw debug output leaks into timeline
   (covered by W4-5)

After discussion, we intentionally scoped DOWN from the original
proposal (clickable enrichment card with confidence score) to a
user-focused minimum plus a developer toggle. Rationale: a non-
technical user does not care HOW a plant got its profile; they care
WHETHER the plant survives. Confidence scores are engineer-brain
leakage. The ONE piece of enrichment metadata with real user value is
the enriched species name — because that's the signal for "did the
system identify my plant correctly?"

## Impact

- **User:** Can spot misidentification at a glance (e.g., "I typed
  palm, it saved as Kentia palm but I think it's Areca"). Easy rename.
- **Product:** Transparency where it matters (species). No
  technobabble where it doesn't (confidence, ratios).
- **Maintenance:** Less UI surface to maintain and explain.

## Definition of Done

- [ ] The enriched species name is rendered prominently on the plant
  detail header (not just in a metadata corner)
- [ ] A small inline action lets the user correct the species ("Not
  this? Rename →") — which updates the identifier and triggers
  re-enrichment
- [ ] In Settings, a toggle: "Show developer info" (off by default)
- [ ] When ON, the plant detail page shows a collapsed panel with
  the raw enrichment metadata: source (Claude / n8n / catalog /
  manual), confidence, raw interval/ratio values, enrichment
  timestamp
- [ ] When OFF, none of that metadata is visible anywhere in the
  user timeline or detail page
- [ ] Timeline enrichment events (covered by W4-5) always show just
  "✓ Care profile added"

## Gherkin

```gherkin
Feature: Surface species, hide mechanics
  As a user checking my plant's profile
  I want to see what species the system thinks it is
  So I can correct mistakes

  Scenario: Species name is prominent
    Given my plant was enriched as "Monstera deliciosa"
    When I open the plant detail page
    Then I see "Monstera deliciosa" prominently near the top

  Scenario: User corrects a misidentification
    Given the enriched species is wrong
    When I tap "Not this? Rename"
    And I type the correct species and confirm
    Then re-enrichment runs
    And the header updates to the new species

  Scenario: Developer info hidden by default
    Given my Settings > "Show developer info" is off
    When I view any plant detail page
    Then I see no confidence scores, raw intervals, or source labels
    And the timeline shows "✓ Care profile added" for enrichment
    events (no raw numbers)

  Scenario: Developer info visible when toggled
    Given I enable Settings > "Show developer info"
    When I view a plant detail page
    Then a collapsed "Developer info" panel is visible
    When I expand it
    Then I see enrichment source, confidence, raw interval/ratio,
    and timestamp
```

## Cross-links

- Depends on / references #56 (copy prompt to clipboard — the
  manual/no-LLM enrichment path also needs to flag its source here).
- Depends on / references #58 (manual paste enrichment fallback —
  same).
- Related: W4-5 (timeline event formatting), W5-3 (splash screen).

## Design note

Original feedback asked for a clickable enrichment card with
confidence indicators. Counter-proposal was accepted to scope DOWN:
the enriched species is the only metadata with user value; everything
else is hidden behind a developer toggle. See triage plan
`docs/plans/2026-04-23-feedback-triage-plan.md` for the full
reasoning.

Origin: feedback DB rows 14 + 15 — 2026-04-23.
---ENDBODY---

### Wave-5-6 — Active conditions: add, edit, remove on plant detail page

**Labels:** `enhancement,client,care-data`

**Origin:** Feedback DB row #16

---BODY---
## Context

The plant detail page shows an "Active Conditions" section. Users
cannot add or edit conditions — the section is read-only. User
feedback: "I cannot add or edit current conditions. I think current
conditions should be 5 or 10 common or typical conditions for that
specific plant and 5 or 10 common conditions that can apply to any
plant (root rot)."

Two capabilities needed:

1. **Editing**: user should be able to add/remove conditions from
   their plant's active list.
2. **Picker source**: the picker should offer a curated list (generic
   + species-specific).

## Impact

- **User:** Conditions become actionable, not a display. Users can
  report problems and get guidance.
- **Product:** Closes the loop from "we have a conditions model" to
  "users can actually use it." Core to plant-trmnl's "help plants
  recover" value prop.

## Definition of Done

- [ ] "Active Conditions" section has an "Add condition" button
- [ ] Tapping "Add condition" opens a picker with two sections:
  - **Common to any plant** (5-10 entries — root rot, overwatering,
    pest infestation, underwatering, leaf yellowing, leaf drop, etc.)
  - **Common for THIS species** (5-10 entries — pulled from species-
    specific care data; empty/hidden if catalog #1 not yet landed)
- [ ] Each condition shows a one-line description
- [ ] Tapping a condition adds it to the plant's active list and logs
  an event
- [ ] Each active condition has a "Remove" affordance
- [ ] Remove logs a resolution event (matches #34's intent if it
  lands first)
- [ ] Free-text fallback: "Other — describe" option for unlisted
  conditions

## Gherkin

```gherkin
Feature: Managing active conditions
  As a user noticing a problem with my plant
  I want to flag the condition and later mark it resolved
  So the app can help me recover the plant

  Scenario: Add a common condition
    Given my plant has no active conditions
    When I tap "Add condition"
    And I pick "Root rot" from the common list
    Then "Root rot" appears in active conditions
    And the timeline logs a "condition_added: root rot" event

  Scenario: Remove a condition
    Given my plant has "Root rot" in active conditions
    When I tap the remove affordance on that condition
    Then "Root rot" is no longer active
    And the timeline logs a "condition_resolved: root rot" event

  Scenario: Species-specific suggestions
    Given my plant is enriched as "Ficus lyrata"
    When I tap "Add condition"
    Then the picker shows "Common to any plant" section
    And the picker shows "Common for Ficus lyrata" section
    And the species section includes fiddle-leaf-specific conditions
    (e.g., brown leaf edges, leaf drop from light change)
```

## Cross-links

Related: #34 (condition remediation/resolution flow), W4-6 (explain
what conditions are), #3 (rich care profiles).

Depends on #3 for high-quality species-specific condition lists; can
ship with empty species section in the interim.

Origin: feedback DB row 16 — 2026-04-23.
---ENDBODY---

### Wave-5-7 — Flag mismatch between ideal and actual living conditions

**Labels:** `enhancement,client,ux,care-data`

**Origin:** Feedback DB row #20

---BODY---
## Context

The plant detail page records the actual conditions the user set for
a plant (light level, location). Enrichment returns the ideal
conditions for that species. No comparison is surfaced. User
feedback: "If the ideal living conditions of the plant don't match the
actual conditions, we should flag that gently. For instance, have a
small '!' in a subtle round circle 'this plant is placed in medium
light conditions, it would do much better in bright conditions'. When
you tap it, a tooltip can show up."

## Impact

- **User:** Discovers placement issues without having to cross-
  reference species care data manually.
- **Product:** Proactive care guidance — a big step beyond passive
  watering schedules.

## Definition of Done

- [ ] On the plant detail page, compare user-set `lightLevel` with
  enrichment's `ideal_light`
- [ ] If mismatch, show a small "!" badge near the light field
  (subtle, not alarming — muted color, not red)
- [ ] Tapping the badge shows a tooltip: "This plant is in <actual>
  light. It would do much better in <ideal> light."
- [ ] No mismatch → no badge
- [ ] Extend to other condition dimensions over time (humidity,
  temperature) — but for this issue, start with light
- [ ] Tooltip copy tuned for gentle tone (no alarm, no guilt)

## Gherkin

```gherkin
Feature: Gently flag care-condition mismatches
  As a user who set up my plant's conditions
  I want the system to tell me when they don't match what the plant
  wants
  So I can reposition the plant

  Scenario: Mismatch shows a subtle badge
    Given my plant is set to "medium" light
    And the enriched ideal light is "bright"
    When I view the plant detail page
    Then a small "!" badge appears near the light field

  Scenario: Badge explains the mismatch
    Given a mismatch badge is showing
    When I tap the badge
    Then I see the text: "This plant is in medium light. It would do
    much better in bright light."

  Scenario: No badge when conditions match
    Given my plant is set to "bright" light
    And the enriched ideal light is "bright"
    When I view the plant detail page
    Then no mismatch badge is shown
```

## Cross-links

Related: #18 (auto-detect conditions from calibration — complementary
signal; this one comes from initial setup, #18 comes from observed
behavior).

Origin: feedback DB row 20 — 2026-04-23.
---ENDBODY---

### Wave-5-8 — Feedback submissions: support image attachments

**Labels:** `enhancement,client,api`

**Origin:** Feedback DB row #22

---BODY---
## Context

User feedback: "In goat-tracker I am able to upload images to the
feedback to clarify, but this is not yet possible here. That should
be fixed."

Images dramatically improve the signal of UI bug reports. Writing "big
ovals" for broken radio buttons takes thought; snapping a screenshot
takes a second.

## Impact

- **User:** Lower friction to report visual bugs.
- **Product:** Higher-signal feedback dataset — especially for UI bugs
  in the self-hosted community release (pre-v1.0).

## Definition of Done

- [ ] Feedback submission form includes an optional image picker (mobile
  camera + gallery support; desktop file picker)
- [ ] Accept image/* MIME types; max size 5MB per image
- [ ] Multi-image support: up to 3 per feedback
- [ ] Server: store images to `packages/api/feedback-uploads/` with
  UUID filenames; gitignored
- [ ] Schema migration: `feedback_images` table (id, feedback_id,
  filename, created_at) — additive, idempotent via
  `addColumnIfMissing` pattern
- [ ] Image rendering on feedback detail page (thumbnail + tap-to-
  enlarge)
- [ ] Image deletion cascades on feedback deletion

## Gherkin

```gherkin
Feature: Attach images to feedback
  As a user reporting a visual bug
  I want to include a screenshot
  So the maintainer can see the problem directly

  Scenario: Attach one image to new feedback
    Given I am filling in the feedback form
    When I tap "Attach image"
    And I select a screenshot from my gallery
    Then I see a thumbnail of the image in the form
    When I submit the feedback
    Then the feedback is created
    And the image is associated with the feedback

  Scenario: Too-large image rejected with a friendly error
    Given I am filling in the feedback form
    When I select an image larger than 5MB
    Then I see "Image too large — max 5MB"
    And the image is not attached

  Scenario: Feedback detail shows attached images
    Given a feedback item has 2 attached images
    When I view that feedback's detail page
    Then I see 2 image thumbnails
    When I tap a thumbnail
    Then the image opens enlarged
```

## Cross-links

Pattern reference: goat-tracker's feedback system (user's own other
project).

Implementation note: consider whether to use the same upload pattern
already in place elsewhere in the app, or introduce multer/similar.

Origin: feedback DB row 22 — 2026-04-23.
---ENDBODY---

---

## Wave 6 — Navigation, branding, design

### Wave-6-1 — Rename app to PLNT throughout copy

**Labels:** `enhancement,client,ux`

**Origin:** Feedback DB row #2

---BODY---
## Context

The app currently shows "Welcome Plant TRMNL" and "plant trmnl" in
various places. User feedback: pick a name and commit to it.
Decision: **PLNT**.

## Impact

- **User:** Consistent naming feels intentional rather than work-in-
  progress.
- **Product:** Clear brand handle for the eventual public release —
  unique enough to search for.

## Definition of Done

- [ ] Replace all user-visible "Plant TRMNL" / "plant trmnl" /
  "plnt-trmnl" references with **PLNT** in the web app
- [ ] Welcome copy becomes "Welcome to PLNT"
- [ ] Page title becomes "PLNT"
- [ ] Meta tags (PWA-ready fields) updated
- [ ] TRMNL-side artifacts: out of scope for this issue — the TRMNL
  template retains its own branding
- [ ] Repo name, package names, docs, CLAUDE.md: out of scope —
  product-internal names don't need to match brand

## Cross-links

Related: Wave-6-2 (logo), Wave-6-3 (menu).

Origin: feedback DB row 2 — 2026-04-23.
---ENDBODY---

### Wave-6-2 — 🪴 emoji as logo, favicon, and PWA icon

**Labels:** `enhancement,client,ux`

**Origin:** Feedback DB row #3

---BODY---
## Context

User feedback: "In the top left, in the menu bar, it says plant
trmnl. Replace that with the plant in the pot emoji, and consider
that the logo of the app. (And should also be the site favicon, and
PWA icon.)"

## Impact

- **User:** Instantly recognizable, distinct, friendly. Zero ambiguity.
- **Product:** Consistent identity across surfaces (web, favicon,
  PWA home-screen, TRMNL where appropriate).

## Definition of Done

- [ ] Menu bar / app header shows 🪴 as the primary logo affordance
  (replaces the text wordmark)
- [ ] Browser favicon set to 🪴 (multiple sizes generated: 16, 32,
  64, 180, 192, 512)
- [ ] PWA manifest updated with the icon set (ties into #59)
- [ ] Apple touch icon configured
- [ ] The wordmark "PLNT" (Wave-6-1) renders alongside the emoji where
  appropriate (e.g., in titles); separate from the icon-only surfaces

## Cross-links

Related: #59 (PWA installable), Wave-6-1 (PLNT naming), Wave-6-3
(menu).

Origin: feedback DB row 3 — 2026-04-23.
---ENDBODY---

### Wave-6-3 — Hamburger menu in top nav

**Labels:** `enhancement,client,ux`

**Origin:** Feedback DB row #4

---BODY---
## Context

User feedback: "In the top make a hamburger with the menu options:
add, archive (leads to the archive of archived plants), feedback,
settings, setup, about."

This consolidates navigation that's currently scattered (FAB for
feedback, no dedicated archive view yet, settings not yet surfaced,
etc.).

## Impact

- **User:** One obvious place for every global action.
- **Product:** Enables retiring one-off UI slots (e.g., the feedback
  FAB could move to the menu once users know where it is).

## Definition of Done

- [ ] Hamburger icon in the top-left or top-right of the app shell
  (pick one — probably top-left given 🪴 logo is also there; menu on
  the right)
- [ ] Menu opens a drawer or dropdown with entries:
  - Add Plant → routes to /add
  - Archive → routes to an archived-plants view (see #33)
  - Feedback → routes to /feedback
  - Settings → routes to /settings (view may be skeletal for now)
  - Setup → routes to /setup (may be skeletal)
  - About → routes to /about (may be skeletal)
- [ ] Existing entry points (the feedback FAB, direct buttons) remain
  for now — they'll be retired in later waves once the menu is
  discoverable
- [ ] Keyboard accessible; trap focus when open; escape closes
- [ ] Mobile-friendly (touch targets ≥ 44px, closes on backdrop tap)

## Cross-links

Related: #33 (archived view), #40 (design pass), Wave-6-4 (vacation
in settings).

Origin: feedback DB row 4 — 2026-04-23.
---ENDBODY---

### Wave-6-4 — Move "Vacation" out of the dashboard and into Settings

**Labels:** `enhancement,client,ux`

**Origin:** Feedback DB row #5

---BODY---
## Context

The dashboard has a "Vacation" button that triggers vacation mode.
It's been there since vacation-mode shipped. User feedback: "There
is a vacation button but that should be in settings."

## Impact

- **User:** Dashboard stays focused on plant care; rarely-used
  actions move to the settings pane.
- **Product:** Clean separation between primary flow (water my
  plants) and configuration (vacation, preferences).

## Definition of Done

- [ ] Vacation affordance removed from the dashboard
- [ ] A "Vacation mode" section appears in Settings (new or expanded
  settings page)
- [ ] Vacation mode indicator (e.g., banner "You're on vacation —
  watering paused") remains visible from the dashboard when active
  — the dashboard should signal the state even if it no longer
  controls it
- [ ] Existing vacation behavior unchanged (bin-packer handling at
  end of vacation, etc.)

## Cross-links

Depends on Wave-6-3 (hamburger menu / settings route).

Origin: feedback DB row 5 — 2026-04-23.
---ENDBODY---

---

## COMMENT-32

**Write this to `/tmp/plnt-comment-32.md` and post with:**
`gh issue comment 32 --body-file /tmp/plnt-comment-32.md`

---COMMENT---
Feedback reaffirmation from 2026-04-23: a user (Emiel) submitted
feedback in the app (DB row #19, category `improvement`) saying:

> more notes — i think i can still only add one note, not more notes.
> that might be picked up in a later wave, i said this before and
> there should be a story for this.

This issue (#32) IS that story. No new issue needed — leaving this
comment as a confirmation that the need is still felt, and that it's
tracked here.

Filed as part of the feedback triage batch on 2026-04-23; full context
in `docs/plans/2026-04-23-feedback-triage-plan.md`.
---ENDCOMMENT---
