# Quality Assurance — FINE Framework

## Goal

Verify that any user-facing feature or component meets both usability and error-handling standards before it ships. This is the authoritative home of QA checklists for Plant TRMNL — `build-app.md` carries condensed guidance; this file carries the complete compliance checklists.

**When to run:** After ATLAS Stress-test and before any PR merge for user-facing work.

**Primary target device:** iPhone 15 Pro (393×852px, iOS Safari). Every checklist item is evaluated against this baseline.

**FINE** is a four-step QA process:

| Step | Phase | What You Do |
|------|-------|-------------|
| **F** | Flows | Verify usability: touch targets, one-handed reach, core flows completable |
| **I** | Inspect error paths | Enrichment failures, empty plant list, network errors, API downtime |
| **N** | Navigate accessibility | ARIA labels, focus management on modals, contrast ratios for dark theme |
| **E** | Exit criteria | All flows completable on iPhone Safari, all tests pass, no regressions |

---

## F — Flows

Run these checklists against every component and page in the feature.

### Per Component

```
[ ] Touch targets >= 44x44px, >= 8px spacing between targets
[ ] No hover-only interactions — every hover state has a touch equivalent
[ ] Consistent with existing patterns for the same action type
[ ] Every action produces visible feedback (tap confirms, spinners on async)
[ ] Destructive actions protected (confirm dialog minimum; undo preferred)
[ ] Labels self-describing without tooltips for basic comprehension
[ ] Inputs constrained appropriately (pickers for dates, number inputs for amounts)
[ ] Component looks like what it does (visual affordances present)
```

### Per Page / Screen

```
[ ] Works at 393px viewport width (iPhone 15 Pro) without horizontal scrolling
[ ] Works at 320px viewport width without horizontal scrolling (minimum)
[ ] Primary CTA reachable one-handed (thumb zone: bottom 60% of screen)
[ ] One primary CTA per viewport
[ ] Calibration modal reachable one-handed from the plant list screen
[ ] Plant list scrollable with thumb (no sticky headers blocking scroll)
[ ] Empty states have message + CTA (e.g. "No plants yet. Add your first plant.")
[ ] Navigation accessible within 1 tap
[ ] Visual hierarchy readable at a squint
[ ] No decorative-only elements competing with content on mobile
```

### Per Flow

Core flows to verify on iPhone 15 Pro (iOS Safari):

**Watering log flow:**
```
[ ] Plant list loads and shows due/overdue plants prominently
[ ] Tapping a plant opens log action within 1 tap
[ ] Watering logged with confirmation feedback (not silent)
[ ] Plant list updates to reflect logged watering (no stale state)
[ ] Flow completable one-handed from home screen to confirmation
```

**Fertilizing log flow:**
```
[ ] Fertilizing action accessible from plant detail or list
[ ] Logged with confirmation feedback
[ ] Schedule updated correctly after log
```

**Calibration flow:**
```
[ ] Calibration modal reachable within 2 taps
[ ] Deadline cutoff (`CALIBRATION_DEADLINE_HOUR`) enforced in UI (no past-deadline entry)
[ ] Modal closeable without submitting (back/escape does not lose data)
[ ] Confirmation visible after successful calibration
```

**General:**
```
[ ] Core goal reachable within 3 taps from entry point
[ ] Smart defaults reduce required decisions
[ ] Back/escape possible at every step without losing work
[ ] First-time user can complete a log without external help
```

---

## I — Inspect Error Paths

Run these checks against every data-touching component in the feature.

### Fail Gracefully

```
[ ] Enrichment failure (n8n webhook down): API returns partial plant data, not 500
[ ] Empty plant list: render friendly empty state with CTA, not blank page
[ ] Network error (API unreachable from renderer): renderer shows last-known state or clear error
[ ] API_INTERNAL_URL unreachable: renderer logs error and serves degraded response
[ ] TRMNL webhook failure: logged, does not crash renderer cron
[ ] Partial failure handled — one plant's enrichment failing does not blank the whole list
```

### Inform the User

```
[ ] Every failure mode mapped to a user-visible message
[ ] Messages follow pattern: "Couldn't [action]. [What to do]." — specific, no HTTP codes
[ ] Network errors show retry option or auto-retry (immediate -> 2s -> 5s)
[ ] Empty states have a message and CTA
[ ] Loading states use skeletons or spinner, not "Loading..." text
[ ] Watering/fertilizing errors surface inline, not silently discarded
```

### Never Crash Silently

```
[ ] No silent catch blocks — errors must be logged (pino) before being swallowed
[ ] No console.log/console.error in production code — use pino structured logging
[ ] Renderer screenshot cron: errors logged with context (timestamp, error message)
[ ] DB errors surface as 500 with logged context, not unhandled rejections
[ ] Express 5 async handlers: unhandled promise rejections propagate to error middleware
```

### Expect the Unexpected

```
[ ] Missing API fields render fallback values ("—" not undefined/null/NaN)
[ ] Archived plants never appear in any list or scheduling logic (WHERE archived = 0)
[ ] Rapid taps on log button do not create duplicate log entries
[ ] Concurrent API requests: DB WAL mode handles concurrent reads correctly
[ ] Unexpected n8n response shapes treated as enrichment errors, not crashes
[ ] TRMNL sends requests on its own schedule: renderer serves pre-rendered static image (no live rendering on TRMNL request)
```

---

## N — Navigate Accessibility

Dark theme baseline: all text must meet WCAG AA contrast (4.5:1 for normal text, 3:1 for large text) against the dark background.

```
[ ] Every icon-only button has aria-label
[ ] Every form input has an associated label or aria-label
[ ] Semantic HTML used (header, nav, main, section, button — not div-soup)
[ ] Focus state visible (focus-visible ring, not removed)
[ ] Color is never the sole indicator of plant status — paired with icon, text, or pattern
[ ] Calibration modal has focus trap when open
[ ] Calibration modal has aria-modal="true" and role="dialog"
[ ] Modal closes on Escape key without data loss
[ ] Error messages use role="alert" (announced to screen readers immediately)
[ ] Loading states have aria-busy="true" and aria-label describing what is loading
[ ] Plant list items have descriptive labels (plant name + due status, not just "water")
[ ] Dark theme contrast ratios verified for:
    [ ] Plant name text on dark background
    [ ] Due/overdue status badges
    [ ] Action buttons (water, fertilize)
    [ ] Empty state text
```

---

## E — Exit Criteria

A feature is ready to ship when all of the following are true:

```
[ ] All vitest tests pass (npm test in affected package)
[ ] No new console warnings or errors in the browser (iOS Safari DevTools)
[ ] FINE checklist above completed with no open items
[ ] User can complete core log flow (water/fertilize) one-handed on iPhone 15 Pro iOS Safari
[ ] Calibration modal reachable and completable one-handed
[ ] No regressions in existing flows
[ ] Archived plants do not appear anywhere in the UI
[ ] Docker Compose: both containers start, health checks green
[ ] .env.example updated if any new env vars introduced
```

---

## Related Files

- `.agents/goals/build-app.md` — ATLAS workflow; error handling guidance in Assemble + Stress-test
- `CLAUDE.md` — Conventions, Express 5 patterns, DB gotchas
- `docs/specs/2026-04-07-plant-trmnl-design.md` — Design specification
- `.env.example` — Required environment variables including `CALIBRATION_DEADLINE_HOUR`
