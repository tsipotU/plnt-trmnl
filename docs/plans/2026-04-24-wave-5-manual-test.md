# Wave 5 manual test script

Run against the live Mac Mini instance (port 3900 on the LAN, or `plant.incal.one` / wherever you front it). Expected duration: **~20 minutes**.

**Tick boxes as you go. If any step fails, note the PR # and issue it belongs to and file a follow-up.**

---

## 0. Pre-flight

- [ ] API running: `curl http://localhost:3900/health` returns `{"status":"ok","service":"plant-api"}`
- [ ] Client loads in browser at the app URL
- [ ] Open DevTools → Network tab (helps spot regressions); keep it open throughout
- [ ] Have at least one **existing** plant in the DB so regression checks work

**Schema migration sanity** (runs automatically on API startup, but verify):

```bash
ssh mac-mini
cd ~/Projects/plant-trmnl
sqlite3 packages/api/plants.db ".schema plants" | grep -E "(identifier|current_interval|pot_size_category|origin_type)"
sqlite3 packages/api/plants.db ".schema facts" | grep -E "(shown_at|source|species)"
sqlite3 packages/api/plants.db ".schema feedback_images"
```

- [ ] `plants.identifier` column exists (#2)
- [ ] `facts.shown_at` column exists (#38)
- [ ] `feedback_images` table exists (#77)

---

## 1. Catalog foundation (#1a, #100)

- [ ] `curl 'http://localhost:3900/api/catalog/search?q=monstera'` → returns at least Monstera deliciosa
- [ ] `curl 'http://localhost:3900/api/catalog/search?q=vrouwentong'` → matches Sansevieria via Dutch alias
- [ ] `curl 'http://localhost:3900/api/catalog/search?q=snake'` → matches Sansevieria via EN common name

---

## 2. Streamlined AddPlant (#2, #107) + catalog dropdown + did-you-mean (#39, #103) + tooltip (#71, #98) + soil-feel (#70, #99)

Navigate to **Add plant**.

### Catalog dropdown
- [ ] Start typing **"mon"** → dropdown shows Monstera, plus a couple of others
- [ ] Click **Monstera deliciosa** → selection fills
- [ ] Pot size visual helper shows categories; select **Medium (15–20 cm)**
- [ ] Location dropdown shows Living room / Bedroom / Kitchen / Bathroom / Office / Balcony suggestions
- [ ] Type a custom location: **"Window shelf"** — accepts custom text
- [ ] Identifier field: type **"Big one by window"** (optional, but test it)

### Light-level help tooltip (#71)
- [ ] Tap the `?` icon next to **Light level** → tooltip appears with low/medium/bright examples + the read-a-book-at-noon test
- [ ] Dismissible

### Soil-feel fallback (#70)
- [ ] Under **When did you last water?**, choose **Don't know**
- [ ] A soil-feel dropdown appears with 5 options (Bone dry / Dry / Slightly moist / Moist / Wet)
- [ ] Try to submit WITHOUT picking a soil-feel → form should block
- [ ] Pick **Dry** → submit enabled

### Submit + enrichment splash (#72, #111)
- [ ] Tap **Add plant**
- [ ] A **splash** appears (NOT the detail page yet) — "We found: Monstera deliciosa" + preview care data + two buttons
- [ ] **Looks right** → navigates to plant detail
- [ ] Verify new plant has:
  - identifier shown ("Big one by window")
  - species populated immediately ("Monstera deliciosa")
  - conditions/facts populated within a few seconds (catalog seeded + enrichment refined)

### Did-you-mean typo path (#39)
- [ ] Add another plant. In the catalog search, type a typo like **"Monstera diliciosa"**
- [ ] Submit (bypass dropdown, use as free text) → on enrichment failure, splash shows "Can't find 'monstera diliciosa'. Did you mean: Monstera deliciosa?"
- [ ] Tap **Yes, that's it!** → re-runs enrichment with corrected name → splash returns with success

### Custom/not-in-catalog fallback
- [ ] Add another plant named **"Rare Orchid Hybrid"** (not in catalog)
- [ ] Splash handles the unknown case gracefully (longer wait OR goes to detail with "still enriching" badge after 10s timeout)
- [ ] Plant gets generic defaults; no catalog facts seeded (verify in DB: `SELECT count(*) FROM facts WHERE source='catalog' AND plant_id=<new-id>` → 0)

---

## 3. PlantDetail — About / Light / Placement / Conditions / Header (#3, #37, #74, #75)

Open the Monstera you added in step 2.

### Species header (#74, #105)
- [ ] "Monstera deliciosa" is **prominent** on the detail header (not in a metadata corner)
- [ ] There's a **"Not this? Rename →"** action next to it
- [ ] Tapping it lets you type a correction → submits → re-enriches

### About card (#37, #104)
- [ ] A collapsible **"About Monstera deliciosa"** card is visible
- [ ] Expand it → shows EN + NL common names, origin, toxicity, lore, etymology
- [ ] Collapse again → hides the content

### Light section (#3, #106)
- [ ] **Light** card shows ideal, tolerance range, direct-sun hours, too-little/too-much symptoms (all from catalog)

### Light mismatch warning (unblocks #76)
- [ ] If you set **light_level = low** during AddPlant and catalog ideal is **bright_indirect**, the PlantDetail shows a subtle amber warning card: "Light mismatch. Monstera deliciosa prefers bright indirect, but this plant is set to low."
- [ ] If you set light to match catalog ideal → no warning

### Placement section (#3)
- [ ] **Placement** card shows 3–4 bullet tips (distance from window, drafts, humidity, etc.)

### Catalog conditions (#3, auto-flagging)
- [ ] **Common conditions** section shows top-5 highlighted by default + "Show all 15 conditions" toggle
- [ ] Each condition shows severity badge + symptoms + remedy + prevention
- [ ] Tap an unflagged condition → it's added to **Active Conditions** above + timeline event logged
- [ ] Tapping again is disabled (the "active" pill shows instead)

### Conditions picker (#75, #108)
- [ ] In **Active Conditions** section, there's an **Add condition** button (separate from the catalog one)
- [ ] Tap it → modal opens with two sections:
  - **Common to any plant** (root rot, overwatering, mealybugs, etc. — ~8 generic entries)
  - **Common for Monstera deliciosa** (top 5 is_common from catalog)
- [ ] Tap a generic condition → added to active + event logged
- [ ] **Other — describe** fallback at bottom → type free text → submits → added to active
- [ ] Each active condition has a **Remove** affordance → removes + logs resolution event

### Dev-info toggle (#74)
- [ ] Navigate to **Settings** from nav chrome
- [ ] Toggle **Show developer info** → on
- [ ] Return to plant detail → a collapsed **Developer info** panel is visible; expand → shows source (catalog/enrichment), raw interval, timestamp
- [ ] Toggle off → panel vanishes
- [ ] Timeline events always show "✓ Care profile added" regardless of toggle (no raw numbers in user view)

---

## 4. Facts rotation + TRMNL (#38, #110)

- [ ] Verify **Facts menu entry** is **gone** from the client nav (#38 removed it)
- [ ] Check DB: `SELECT count(*) FROM facts WHERE source='catalog' AND species='Monstera deliciosa'` → should be **15** (seeded once via dedup — subsequent Monsteras don't duplicate)
- [ ] Check fact rotation: `SELECT shown_at FROM facts WHERE source='catalog' AND species='Monstera deliciosa' LIMIT 5` — if any are NULL, the 6 AM cron hasn't run yet; that's fine
- [ ] **Optional — trigger the cron manually** (the pick-fact logic): see `packages/renderer/` for the scheduler module and look for a test endpoint or invoke the function in a REPL
- [ ] Open TRMNL preview (`/trmnl-preview` in the client) — payload should include `todays_fact` if a fact has been picked
- [ ] Wait overnight or run the cron manually → TRMNL shows "Today's Fact: <text>" on the e-ink display

---

## 5. Dry-soil calibration + seasonal multiplier (#36, #102)

This one is mostly observational — it reshapes scheduling math.

- [ ] Verify config is loaded: `curl http://localhost:3900/health` → (if the endpoint exposes config, check) — or inspect `.env.example` has `GROWING_SEASON_START`, `GROWING_SEASON_END`, `DRY_DAYS_BASE`, `GROWING_SEASON_MULTIPLIER`, `DORMANCY_MULTIPLIER`
- [ ] On a plant, trigger a water → check the plant's next_water_date. With today's date in April (growing season), the effective interval should be **shorter** than the base `current_interval` (multiplier 0.8)
- [ ] Check `plant_events` for a `seasonal_adjustment` event with a `reason` field describing which layer fired (growing / heating / both)

If the actual behavior disagrees with the design in `docs/plans/2026-04-24-issue-36-design.md`, file a follow-up.

---

## 6. Feedback image uploads (#77, #101)

Navigate to the **Feedback** form.

- [ ] **Attach image** button visible
- [ ] Tap it → opens camera/gallery on mobile, file picker on desktop
- [ ] Pick a small image (< 5 MB) → thumbnail appears in the form
- [ ] Try attaching **4 images** → form should block at 3 (max per feedback)
- [ ] Try attaching a **large image** (> 5 MB, fake one with a large PDF renamed to .jpg if needed) → friendly error "Image too large — max 5MB"
- [ ] Submit feedback → feedback detail page shows thumbnails + tap-to-enlarge
- [ ] Verify: `ls packages/api/feedback-uploads/` shows UUID-named files
- [ ] Delete the feedback → files and rows both removed (`ls` the dir + check `feedback_images` table is empty for that feedback_id)

---

## 7. Archive cascade sanity (regression)

Archive a plant you no longer want:

- [ ] Archive button works, plant moves to `/archived`
- [ ] Its species facts are **soft-disabled** (not deleted): `SELECT is_disabled, count(*) FROM facts WHERE plant_id=<archived-id> GROUP BY is_disabled` — should show `is_disabled=1` rows
- [ ] If you add a **new plant of the same species**, the old species facts **re-enable** (dedup + re-enable flow from #4)

---

## 8. Cross-cutting smoke

- [ ] Dashboard still loads, shows watering schedule
- [ ] Archived view (`/archived`) still lists archived plants
- [ ] TRMNL preview (`/trmnl-preview`) renders without errors
- [ ] 7-day calendar strip still renders
- [ ] Batch water still works (select multiple plants + water all)
- [ ] Undo-water still works on a freshly watered plant

---

## Known carry-forwards (don't file as bugs)

- `#1b` catalog expansion to 250+ entries — deferred to Wave 7
- `#7`, `#18`, `#78–#81` — Wave 6 scope
- Wave 3 follow-ups (useWeekSchedule error surfacing, etc.) — still open, low-priority

---

## If a step fails

1. Note the PR# and issue# it traces to (see HANDOFF.md "What shipped in Wave 5" table)
2. Open a new issue, reference the failing test step
3. If the failure is blocking daily use, revert that PR's feature commit and open a fix branch

---

## Done?

Update `docs/HANDOFF.md` "Last updated" date and note which steps passed, so the next session has a grounded picture.
