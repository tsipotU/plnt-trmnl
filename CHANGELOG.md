# Changelog

All notable changes to plnt-trmnl are documented here.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Wave 19 closes — Dog-food round 2 shipped 9 PRs in one burndown (2026-05-07)

The wave finished in one continuous burndown. 12 in-app feedback rows triaged into 11 GitHub issues (#201–#211), 8 in scope for Wave 19, 3 deferred to v1.1 backlog (#209 profile-pic variant, #210 add-flow holistic rework, #211 acknowledgement pattern). All 9 PRs auto-merged to `main`.

Two of the bugs (#202, #204) turned out to have different root causes than the user descriptions implied — same "trace before fixing" pattern as Wave 17.

- **[#202](https://github.com/tsipotU/plnt-trmnl/issues/202) — Watering chip/toast desync** ([PR #212](https://github.com/tsipotU/plnt-trmnl/pull/212)). User reported toast saying "next watering may 15" when the chip showed `10D` interval (today=2026-05-07, so toast = +8d, chip = 10d). **Root cause:** the bin-packer (`packages/api/src/scheduling/bin-packer.ts`, `SEARCH_RADIUS=3`) intentionally shifts `next_water_date` ±N days to balance load across plants in the same location. Toast read the bin-packed date; chip read the raw `current_interval`. Both correct internally, mental-model mismatch in the UI. Fix: combined the "Next water" + "Cycle" DataCells into a single "Schedule" cell rendering `Every 10d · Next: 15 May 2026`. Drift indicator preserved when `base_interval !== current_interval`. Bin-packer untouched.
- **[#208](https://github.com/tsipotU/plnt-trmnl/issues/208) — Mother-plant picker filtered to same species** ([PR #213](https://github.com/tsipotU/plnt-trmnl/pull/213)). Picker rendered for any user with ≥1 plants and listed *all* of them regardless of species (FB#49: a cactus offered as mother for a Monstera). Module-scope `normalizeSpecies()` (`(s ?? '').trim().toLowerCase()`); IIFE in JSX with three branches — empty species → "Select a species first" hint, no same-species candidates → "no [species]s in your collection yet" empty-state, otherwise → filtered select. Outer `existingPlants.length > 0` guard preserved (zero-plants case stays hidden). Same-species (not same-genus) since propagation is normally clonal; revisit when v2 propagation guides come in.
- **[#204](https://github.com/tsipotU/plnt-trmnl/issues/204) — EnrichmentSplash routes catalog matches correctly** ([PR #214](https://github.com/tsipotU/plnt-trmnl/pull/214)). User picked from typeahead → splash showed "we don't have detailed info yet" instead of catalog success. Recon found that `catalog_slug` is **not a DB column** — only an input to `plants.ts:399` for catalog seeding, never persisted. Old code derived `hasCatalogPayload = !!(plant.species && plant.illustration_path)`, but many catalog species lack illustrations (gated on the deferred #138 pipeline), so legitimate catalog picks fell into the no-match branch. Fixed by branching on the client-side React state `catalogSlug` (set explicitly at typeahead selection time by `setCatalogSlug(entry.slug)`) rather than the post-creation derived field. The state is the source of truth for "did the user pick from the catalog" — the response field is the wrong place to look.
- **[#207](https://github.com/tsipotU/plnt-trmnl/issues/207) — /add form validation** ([PR #215](https://github.com/tsipotU/plnt-trmnl/pull/215) + [PR #216](https://github.com/tsipotU/plnt-trmnl/pull/216) test fix-up). FB#48: empty submit silently no-oped. New `INLINE_REQUIRED_FIELDS = ['name']` + `getMissingInlineRequired()` helper at module level, `fieldErrors: Set<InlineRequiredField>` state, validation gate at top of `handleSubmit` (sets errors → focuses `#name` → returns early), `handleNameChange` clears the error on first keystroke. Name input gets `aria-required="true"`, conditional `aria-invalid`, `aria-describedby`, inline `<p role="alert">Species is required</p>`. New `.p7l-addplant__field-error` rule using `--status-overdue` (rust). `wateredWhen` is not gated because it always defaults to `'today'`. Aligns with FINE framework (Fail gracefully + Inform). PR #216 added the missing Gherkin Scenario 4 test (successful submit after fixing errors) caught by spec review on #215.
- **[#205](https://github.com/tsipotU/plnt-trmnl/issues/205) — /add placeholders use concrete personal nicknames** ([PR #217](https://github.com/tsipotU/plnt-trmnl/pull/217)). Two placeholder strings: identifier `"e.g. Hanging basket, Blue pot"` → `"e.g. the big one, mom's cutting"`; location `"Or type your own (e.g. Kitchen windowsill)"` → `"Or type your own (e.g. living room window)"`. Per Emiel's clarification on FB#45 — the abstract examples didn't read like the personal nicknames users actually use.
- **[#206](https://github.com/tsipotU/plnt-trmnl/issues/206) — Pot size labels — Tiny/Huge + tooltip clarifies absolute scope** ([PR #218](https://github.com/tsipotU/plnt-trmnl/pull/218)). Two label renames in `POT_SIZE_OPTIONS` (AddPlant.tsx) + duplicate `POT_SIZE_CATEGORIES` (PlantDetail.tsx): `Extra Small (8 cm)` → `Tiny (8 cm)`, `Extra Large (30 cm)` → `Huge (30 cm)`. **`value` strings unchanged** for back-compat with saved data; **cm values unchanged** so the watering algorithm (which reads numeric `pot_size_cm`) is unaffected. PotSizeTooltip got a clarifying line: "Pot sizes are absolute (diameter at the rim). The watering schedule uses your pot's volume — bigger pot, more soil, longer interval."
- **[#203](https://github.com/tsipotU/plnt-trmnl/issues/203) — Emoji sweep round 2 — auto-log + Enriching splash** ([PR #219](https://github.com/tsipotU/plnt-trmnl/pull/219)). The `eventIcon` map at `PlantDetail.tsx:171-184` rewritten to map event types → `ReactNode`: Pictogram for decorative cases (`watered → drop`, `fertilized → leaf`, `pruned → scissors`, `repotted → pot`, `photo → camera` — `camera` is a new Pictogram catalog entry), retained typographic glyphs for semantic ones (`note: '✎'`, `enrichment_complete: '✓'`, `overflow_rebalance: '↔'`, `schedule_congested: '⤵'`). EnrichmentSplash: enriching-mode `<div>✨</div>` removed entirely (loading state conveyed by surrounding text); success-mode fallback `<span>🌿</span>` → `<Pictogram name="leaf" size={80} />`. New regression test asserts no emoji codepoints inside `.p7l-plant-detail__log`. **Caveat:** the wave's spec exit criterion ("no decorative emoji in client *.tsx") was overspecified vs the issue's actual scope; remaining surfaces tracked in [#221](https://github.com/tsipotU/plnt-trmnl/issues/221) as a follow-up.
- **[#201](https://github.com/tsipotU/plnt-trmnl/issues/201) — Header polish — drop emoji + wordmark font verified** ([PR #220](https://github.com/tsipotU/plnt-trmnl/pull/220)). The `<span aria-hidden="true" className="p7l-nav-header__logo">🪴</span>` removed from `Header.tsx`. Orphaned `.p7l-nav-header__logo` CSS rule deleted. `.p7l-nav-header__brand` updated with `font-family: var(--font-display)` (Fraunces, per Foundations/Naming.mdx). New test asserts no emoji codepoints in the wordmark text.

**Test baseline at end of wave: API 557 + client 241 + renderer 60 = 858 tests pass.** Client +14 from the wave's 9 PRs (#212 +3, #213 +4, #214 +1, #215 +4, #216 +1, #217 +0, #218 +0, #219 +1, #220 +1). API and renderer unchanged (no source changes outside the client package).

**Filed as follow-up:** [#221](https://github.com/tsipotU/plnt-trmnl/issues/221) — "Emoji sweep round 3 — remaining decorative emoji surfaces." Wave 19's #203 was scoped to two specific surfaces (care-log + EnrichmentSplash); other surfaces (`PlantCard`, `Dashboard`, `ErrorBoundary`, `CalibrationModal`, `CalibrationSequence`, `DidYouMeanSplash`, archive emoji in Memorial / Archived / Detail-sheets) need their own per-case decision (Pictogram / remove / semantic-keep).

**Wave 19, Wave 17, and Wave 15 milestones closed.** Wave 17/15 were already at zero open issues; long-overdue housekeeping cleared in this wave-end gate.

**v1.0.0 reframed:** Emiel clarified mid-session that "we need images for every plant before i will label it v1." v1.0.0 tag is now explicitly gated on **#138 illustration pipeline** (currently v1.1 backlog with the generation-source decision still open), NOT on user satisfaction as the prior wrap-up suggested. 444 catalog species today; only 1 has `image_path`. The pipeline picks the v1.0.0 timing.

### Wave 15 begins — PWA install + offline (2026-05-07)

**[#59](https://github.com/tsipotU/plnt-trmnl/issues/59)** — installable home-screen PWA with the design-system app icon. The original ticket called for a 🪴-emoji-rendered icon and `name: "Plant TRMNL"`; both predated the post-Wave-17 brand system, so the issue was refreshed first and the work is now grounded in the actual design system.

- **Icon export from `ApothecaryStamp` as single source of truth.** New `packages/api/client/scripts/build-app-icons.ts` server-renders the design-system stamp (with `microtextOff`) inside the canonical AppIcon plate, then `sharp` rasterizes to PNG at 192/512/180 for both bone (light) and slate (dark) plate variants — six manifest icons + iOS `apple-touch-icon` covered from one component. Same script also emits a mode-aware `favicon.svg` (CSS `prefers-color-scheme` swaps the ink color) and 16/32 PNG fallbacks. Wired as a `prebuild` step so PNGs always reflect the current React component — no commit-the-PNG drift. Legacy 🪴 emoji assets (`apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `favicon-64.png`) deleted.
- **`vite-plugin-pwa` integration with brand-aligned manifest.** `name: "p7l"`, `short_name: "p7l"`, `display: "standalone"`, `theme_color: #f5f3ec` (bone-100), `orientation: "portrait"`, full icon set with `media: "(prefers-color-scheme: …)"` so light/dark mode environments install the matching plate. Manifest is generated at build, replacing the hand-edited `public/manifest.webmanifest`.
- **Service worker via Workbox.** Auto-update mode (silent install on next visit). Precache app shell on first install (24 entries, ~520 KiB). Stale-while-revalidate for GET `/api/plants(/:id)?`, `/api/schedule/week`, `/api/screen` with 24h cache. Background Sync queues for POST water mutations (`/water`, `/undo-water`, `/water-all`, `/undo-batch`), POST calibration, and PUT plant edits (archive flow); 24h max retention. iOS Safari without Background Sync API: queue persists in IndexedDB and replays on next SW activation.
- **HTML head tightened.** `viewport-fit=cover` so the app flows under iPhone notch / Dynamic Island. Dual `<meta name="theme-color">` with `prefers-color-scheme` light/dark variants pointing at bone-100 / slate-700. Dual `<link rel="apple-touch-icon">` with `media` for iOS 17.4+ mode-aware home-screen icons. `apple-mobile-web-app-capable` + `apple-mobile-web-app-title` for legacy iOS.
- **Storybook isolated from PWA pipeline.** `.storybook/main.ts` `viteFinal` strips every `vite-plugin-pwa:*` plugin from the Vite config Storybook inherits. Without this, Storybook's own multi-MB `sb-manager/globals-runtime.js` chunk crashed Workbox's 2 MiB precache cap on every build. Storybook is the design surface; the PWA layer doesn't belong there.

### Wave 17 closes: 12 issues shipped in second burndown (2026-05-06)

The wave finished in this session. All 18 issues in the milestone are closed; the wave-17 design-system + dog-food cluster is fully merged to `main`. Below is one entry per shipped PR, in merge order. Several reports turned out to have a different root cause than the user described — pattern: dog-food bugs describe symptoms, not causes.

- **[#161](https://github.com/tsipotU/plnt-trmnl/issues/161) — BackBar 'Today' button clipped on narrow viewports** ([PR #182](https://github.com/tsipotU/plnt-trmnl/pull/182)). Both `.p7l-backbar__back` and `.p7l-backbar__actions` defaulted to `flex-shrink: 1`. With a long location eyebrow and a sub-430px viewport, the back button could shrink below its content and clip. Pinned both to `flex-shrink: 0` so the eyebrow (which already truncates with ellipsis) is the only item that absorbs width pressure.
- **Drive-by build fix** ([PR #183](https://github.com/tsipotU/plnt-trmnl/pull/183)). `plant-notes-integration.test.ts` had a flat-number config stub that vitest accepted (esbuild type-erases) but production `tsc` rejected. Re-applied the fix HANDOFF #180 said had landed but evidently regressed.
- **[#171](https://github.com/tsipotU/plnt-trmnl/issues/171) — Dynamic version display, replace hardcoded 'v1.0.0'** ([PR #185](https://github.com/tsipotU/plnt-trmnl/pull/185)). About + Settings rendered `Instance · v1.0.0` as a literal — but actual version is `0.1.0`. New `__APP_VERSION__` global injected via Vite `define` from `packages/api/package.json`. About + Settings + Drawer story now show truth, auto-update on every version bump. `vitest.config.ts` got the same define so jsdom tests resolve the global.
- **[#167](https://github.com/tsipotU/plnt-trmnl/issues/167) — Humanized water-state labels on every surface** ([PR #186](https://github.com/tsipotU/plnt-trmnl/pull/186)). Replaces `In 5d` / `Overdue 3d` / `Due today` with kitchen-sink-glance relative-time labels (`today`, `tomorrow`, `yesterday`, `in a few days`, `a few days ago`, `in about a week`, `about a week ago`, `in over a week`, `over a week ago`, short-date fallback past 14 days). New `humanizeDaysFromToday(days, {fallbackIsoDate?})` utility; mirrored in `packages/api/client/src/utils/humanize-days.ts` and `packages/renderer/src/render/humanize-days.ts` (renderer is a separate workspace; "third-surface refactor" rule). Client suite +39 tests, renderer suite +17 tests.
- **[#157](https://github.com/tsipotU/plnt-trmnl/issues/157) — Tooltips clipped on /add (overflow, not z-index)** ([PR #187](https://github.com/tsipotU/plnt-trmnl/pull/187)). User reported "z-index too low"; real cause was overflow. `.p7l-addplant__form { overflow-y: auto }` clipped any absolutely-positioned descendant at its edges. Switched `PotSizeTooltip` and `LightLevelTooltip` popovers to `position: fixed` with coords from `getBoundingClientRect()` + viewport clamp. Reposition on resize/scroll while open. No portal needed — fixed escapes ancestor overflow.
- **[#159](https://github.com/tsipotU/plnt-trmnl/issues/159) — Stray visual line in /feedback tag filter** ([PR #188](https://github.com/tsipotU/plnt-trmnl/pull/188)). One-line fix: `FeedbackList` stacked two `<FilterRail>`s (default `bordered: true`); the upper rail's bottom border rendered as a divider *between* the two filter sections. Pass `bordered={false}` on the upper rail; the compact lower rail keeps its border for the section's bottom edge.
- **[#165](https://github.com/tsipotU/plnt-trmnl/issues/165) — Feedback FAB: speech-balloon icon + left anchor** ([PR #189](https://github.com/tsipotU/plnt-trmnl/pull/189)). Replaced `✚` glyph with a `balloon` Pictogram (added to the icon catalog using the same 24×24 mid-century geometry). Moved from `right: 16px` to `left: 16px` so comms anchors with primary nav rather than competing with right-side add-item FABs.
- **[#158](https://github.com/tsipotU/plnt-trmnl/issues/158) — iOS form-input zoom (page left zoomed after popup)** ([PR #190](https://github.com/tsipotU/plnt-trmnl/pull/190)). iOS Safari auto-zooms when a form control has `font-size < 16px` and **never auto-zooms back out** on blur. Five rules across four files lifted from 14px to 16px (`FeedbackButton.css`, `SearchBar.css`, `FeedbackDetail.css` ×2, `AddPlant.css`). Each touched rule got an inline `#158` comment so this doesn't get "optimized" back.
- **[#173](https://github.com/tsipotU/plnt-trmnl/issues/173) — Plant images don't load on dashboard rows** ([PR #191](https://github.com/tsipotU/plnt-trmnl/pull/191)). Dashboard / PlantsList / Calendar were rendering a generic leaf Pictogram for every plant, ignoring `illustration_path`. New `PlantThumb` component renders the catalog `<img>` when set, falls back to the leaf Pictogram on null **or on image error** (catalog rollout is partial). Wired in all three pages.
- **[#174](https://github.com/tsipotU/plnt-trmnl/issues/174) — Calendar today-cell visually agrees with empty list** ([PR #192](https://github.com/tsipotU/plnt-trmnl/pull/192)). Today was unconditionally filled-ink on `/calendar` regardless of plant count. Tapping today produced "Nothing scheduled." but the calendar still implied activity. Two-way split: today + has-events → filled ink; today, no events → subtle surface bg + bold day number. Removed dead `.--overdue.--today` rule (overdue requires `cell.iso < todayIso` so today is never overdue).
- **[#164](https://github.com/tsipotU/plnt-trmnl/issues/164) — Archive flow polish: drop top-right archive button + soften 'died' copy** ([PR #193](https://github.com/tsipotU/plnt-trmnl/pull/193)). Removed the duplicate top-right archive `⊘` button on plant detail (Danger zone "Archive plant" button at the bottom is now the sole entry point). Softened user-facing copy: "Died" / "It died" → "Passed away" / "It passed away" across archive sheet, archived list, memorial page. The `'died'` enum stays — that's the stable database/API identifier; only labels changed.
- **[#162](https://github.com/tsipotU/plnt-trmnl/issues/162) — Plant image lightbox** ([PR #194](https://github.com/tsipotU/plnt-trmnl/pull/194)). Tap thumb on plant detail → fullscreen overlay with image; click outside or press Escape to close. Implementation page-local in `PlantDetailHero` per the project's "third surface = refactor" convention (FeedbackDetail already has an inline lightbox; PlantDetailHero is the second). Accessible: real `<button>`, `role="dialog" aria-modal="true"`, scoped Escape handler.
- **[#172](https://github.com/tsipotU/plnt-trmnl/issues/172) — Native pull-to-refresh hangs on dashboard** ([PR #195](https://github.com/tsipotU/plnt-trmnl/pull/195)). One-line fix: `overscroll-behavior-y: none` on `body`. iOS Safari's native PTR triggered the spinner but `location.reload()` round-tripped through auth gate / Cloudflare tunnel awkwardly and the UI hung in the pulled-down state. We don't need PTR (data refreshes on mount + after every action); a custom in-app Banner-style "Updated N ago — Refresh" is the right shape if a refresh affordance is ever wanted.

**Test baseline at end of session: API 557 + client 227 + renderer 60 = 844 tests pass.** Client +44 from session start (humanize-days 21 + plantView 18 + PlantDetailHero lightbox 5). Renderer +17 (mirrored humanize-days). API −30 net (vacation removal of 30 tests).

**Wave 17 milestone closed.** All 18 issues resolved (16 merged, 1 closed-as-side-effect, 1 closed-as-duplicate). Next wave: 14 — TRMNL identity (#7 template + #138 illustration pipeline).

### Wave 17: sunset vacation mode permanently (#166, 2026-05-06)

- **Removed.** Vacation mode is gone — code, persisted state, historical event-log rows, UI, settings entry, stories, conventions reference. There is no replacement; this is a permanent sunset.
- **Migration runs on container start (idempotent).** Two `DELETE` statements added to `initializeSchema`: drops the `vacation_until` row from `app_state` and any `vacation_start` / `vacation_end` rows from `event_log`. Plants that were in active vacation simply resume normal scheduling at the next cron tick — no backfill, no resolution event.
- **API surface removed:** `/api/vacation` (POST + DELETE) endpoints, the `vacation` boolean on `/api/schedule/week` day responses, and the rest-day branch in `/api/screen/today` that triggered when vacation was active. `screen.ts` and `schedule.ts` collapsed to single non-conditional code paths.
- **Files deleted (4):** `packages/api/src/scheduling/vacation.ts` (+ test), `packages/api/src/routes/vacation.ts` (+ test), `packages/api/client/src/components/VacationToggle.tsx`.
- **Files edited:** `packages/api/src/index.ts` (route unwiring), `packages/api/src/routes/schedule.ts` and `screen.ts` (logic simplification), `packages/api/src/database/schema.ts` (cleanup migration), `packages/api/src/database/event-log.test.ts` and `routes/screen.test.ts` (vacation-specific tests removed). On the client: `CalendarStrip.tsx` (🌴 day-tile indicator gone), `Calendar.tsx`, `Dashboard.tsx` (vacation banner gone), `PlantsList.tsx` (comment updated), `utils/plantView.ts` (`'vacation'` removed from `PlantStateInfo['tone']`), `RowState.tsx` + `.css` (`'vacation'` tone removed).
- **Stories cleaned.** `RowState.stories.tsx`, `Banner.stories.tsx`, `Chip.stories.tsx`, `Toggle.stories.tsx`, `FilterRail.stories.tsx`, `SettingsRow.stories.tsx`, and `Composition.mdx` had vacation variants removed. Where a story used "Vacation mode" purely as a demo label (Toggle, SettingsRow, Composition examples), the label was replaced with "Dark theme" — a real setting that exists in the project, not fictional filler.
- **Why now:** vacation mode shipped but didn't earn its keep. It complicated scheduling logic, added UI surface area, and wasn't used. Sunsetting permanently lets the data model, schedule code, and settings surface simplify before v1.0. See [issue #166](https://github.com/tsipotU/plnt-trmnl/issues/166) for the full case.
- **Test impact:** API suite 587 → 557 (30 vacation-specific tests deleted). Client suite count unchanged (CalendarStrip / Calendar fixtures had `vacation: false` field stripped, no test cases removed). Acceptance grep `vacation\|is_vacation` returns zero matches in non-archive paths.

### Wave 17: undefined-token sweep across non-nav components (#170, also closes #156, 2026-05-06)

- **Closes the rest of the `--bg-secondary` regression cluster** — the audit half of the work #169 started. Where #169 introduced the proper `--nav-*` tokens for the three nav components, this PR replaces every remaining undefined-token reference in the codebase with the correct semantic token.
- **Three undefined tokens, 14 files, 76 references swept.** The audit grew once we widened the search beyond the issue's title: not just `--bg-secondary` (6 files) but also `--text-primary` and `--text-secondary` (8 more files). All three are token names that were never defined in `tokens.css`; CSS resolves unknown custom-property references to nothing, so backgrounds rendered transparent and text rendered with no color set.
- **Substitutions:**
  - `var(--bg-secondary)` → `var(--bg-elevated)` (white in light, `#1c2024` in dark — the existing token for elevated card surfaces)
  - `var(--text-primary)` → `var(--ink)` (primary body text)
  - `var(--text-secondary)` → `var(--ink-2)` (muted text)
- **Files touched:** `EnrichmentSplash`, `BatchUndoToast`, `ConditionCard`, `PlantCard`, `CalibrationModal`, `CalibrationSequence`, `DidYouMeanSplash`, `CalibrationExplanation`, `CollapsibleSection`, `VacationToggle` (sunset by #166 but left consistent here), `PotSizeTooltip`, `AuthGate`, `LightLevelTooltip`, `ErrorBoundary`. All `@legacy` pre-catalog scaffolding — the bug was only visible on these older surfaces; new catalog primitives use the correct tokens.
- **Closes #156** as a side effect. The "foldout menu on /add transparent" report turned out to be the `EnrichmentSplash` (post-submit overlay), which had 16 undefined-token references. With those fixed, the splash renders opaque and `--ink`/`--ink-2` text shows in proper contrast. The "foldout menu" terminology in the original report was the user reaching for the closest UI metaphor for an unfamiliar component — banked as a feedback memory: dog-food terminology rarely matches code-side component names.
- **Test baseline:** **587** API + client tests pass (no test changes — visual rebinding doesn't move semantic queries). Visual verification deferred to deployed dog-food check.

### Wave 17: navigational surface design pass (#169, 2026-05-06)

- **Closes the design-system gap that left Header / MenuDrawer / HamburgerMenu transparent.** All three components referenced `var(--bg-secondary)`, a token that had never been defined in `tokens.css` — CSS resolves unknown custom-property references to nothing, so the components rendered see-through and content scrolling underneath bled through. The fix isn't a patch; the design system was missing a primitive.
- **New `--nav-*` token layer (10 tokens).** Six visible-surface tokens (`--nav-surface`, `--nav-surface-elev`, `--nav-edge`, `--nav-edge-soft`, `--nav-scrim`, `--nav-shadow-elev`) plus `--nav-surface-blur` and three z-indexes (`--nav-z-header`, `--nav-z-scrim`, `--nav-z-drawer`). Tokens are layer-named, not component-named — future nav surfaces (bottom-tab bar, pinned filter rail) reuse the treatment without coining new tokens. Dark-mode rebindings live alongside under `[data-theme="dark"]`.
- **Header rebound** (`Header.tsx` + new `Header.css`). Inline styles moved to a stylesheet. Two states: at-rest (opaque paper, soft hairline edge, no shadow) and scrolled (edge crisps to `--nav-edge`, `--nav-shadow-elev` lifts). Scroll detection via `IntersectionObserver` on a 1px sentinel above the page content — cheaper than a scroll listener, no rAF, with a 4px threshold to avoid iOS rubber-band flicker. The `data-scrolled` attribute is the contract.
- **MenuDrawer rebound** (`MenuDrawer.tsx` + new `MenuDrawer.css`). Backdrop `rgba(0,0,0,0.4)` → `--nav-scrim` (ink-toned, not neutral black). Panel `--bg-secondary` → `--nav-surface` with a `--nav-edge` left border and `--nav-shadow-elev`. Inline styles moved to CSS classes; transform is now state-driven via `[data-open="true"]`. Behaviour (focus trap, Escape, route-change-closes, body scroll lock) is unchanged.
- **HamburgerMenu rewritten** (`HamburgerMenu.tsx` + new `HamburgerMenu.css`). The chunky `≡` glyph is replaced by three 1px hairlines that cross into an X on `aria-expanded="true"` over 160ms with `--ease-standard`. Reads as *three rules* — same vocabulary as the horizontal rules in NotesLog, History strip, Conditions list. 44×44 tap target preserved.
- **Storybook expansion (the regression contract).** 10 new stories + 1 Foundations docs page. `Nav/Header` (AtRest / Scrolled / ScrolledDark — the Scrolled story is the contract; if it ever snapshots transparent again, chromatic diff screams). `Nav/HamburgerMenu` (Closed / Pressed / Open). `Nav/MenuDrawer` (Closed / Open / OpenLongList / OpenDark). `Foundations/Navigational surface` MDX documents the diagnosis, the token layer, the treatment for each of the three components, and the opt-in frosted-glass variant. After this lands the catalog has **9 atoms · 26 molecules · 3 nav · 7 Foundations pages**.
- **Frosted-glass variant** ships in tokens but not as the active default. Fits the "ambient, calm" brief but breaks the editorial vocabulary; opaque-paper stays the active treatment. Available via `[data-nav-surface="glass"]` for users who flip the data attribute.
- **Resolves the in-app feedback transparency cluster.** Feedback rows around mobile nav transparent on scroll, mobile foldout menu transparent, top menu bar transparent. May also resolve [#157](https://github.com/tsipotU/plnt-trmnl/issues/157) (foldout menu on /add) — verify in next dog-food pass. **Out of scope:** the 7 non-nav components also referencing `--bg-secondary` ([#170](https://github.com/tsipotU/plnt-trmnl/issues/170)).
- **Test baseline:** all 20 nav tests pass without modification (semantic queries on roles / aria attributes are stable across the markup change). Full API + client suite green at 587 tests.

### Wave 17: in-place "Add note" button in empty state (#176, 2026-05-06)

- **Discoverability fix on the plant detail Notes section.** Empty state previously read *"No notes yet. Tap the Note quick-action to add one."* — but the QuickAction lives at the top of the page, off-screen once a user has scrolled down to Notes. Added a primary "+ Add note" button inside the empty state, wired to the same `setSheet('note')` handler the QuickAction uses.
- **Originally filed as #160** ("Notes don't save"). Investigation across every layer (API isolated, API in production-mounted stack, NoteSheet component, full PlantDetail user journey) found the save flow worked end-to-end. Real root cause: discoverability — users found the empty state's instructional copy but not the QuickAction it pointed to. #160 closed; refiled as #176 with the concrete UX fix.
- **Test coverage gap closed** alongside the fix. The note save flow had no client-side tests (`PlantDetail.test.tsx` covered conditions / archive / timeline but skipped notes). Added 3 new test files:
  - `NoteSheet.test.tsx` (2 tests) — POST + `onSaved` on success, `onError` on failure.
  - `PlantDetail.notes.test.tsx` (2 tests) — full QuickAction → NoteSheet → save journey + the new empty-state button entry point.
  - `plant-notes-integration.test.ts` (1 test) — POST through the production-mounted stack (plants router + plant-notes router both at `/api/plants`), guards against routing collisions the existing isolated test couldn't catch.
- **Test baseline:** API **587** tests (was 581) across 38 files.

### Wave 17 groomed in: dog-food triage + milestone restructure (2026-05-06)

- **Dog-food run on the running instance** (after the p7l-rebrand rebuild deployed locally) produced 18 in-app feedback items. Combined with 3 stale-but-open feedback rows from the 2026-04-26 dog-food window, 20 items were triaged in this session.
- **Filed 17 GitHub issues** ([#155](https://github.com/tsipotU/plnt-trmnl/issues/155)–[#171](https://github.com/tsipotU/plnt-trmnl/issues/171)) from the dog-food batch + 3 follow-ups ([#172](https://github.com/tsipotU/plnt-trmnl/issues/172)–[#174](https://github.com/tsipotU/plnt-trmnl/issues/174)) for the older items. Bugs and UX polish for plant detail, feedback page, mobile nav, archive flow, and watering states. Plus [#166](https://github.com/tsipotU/plnt-trmnl/issues/166) (sunset vacation mode permanently), [#169](https://github.com/tsipotU/plnt-trmnl/issues/169) (nav surface design pass with Claude Design output), [#170](https://github.com/tsipotU/plnt-trmnl/issues/170) (audit of 7 components referencing the undefined `--bg-secondary` token), [#171](https://github.com/tsipotU/plnt-trmnl/issues/171) (hardcoded "v1.0.0" placeholder in About + Settings).
- **Claude Design produced a nav-surface design pass** with diagnosis (`--bg-secondary` token genuinely undefined in `tokens.css`), 6 new `--nav-*` tokens, component-binding diffs for Header / MenuDrawer / HamburgerMenu, and Storybook coverage spec (3 nav molecules + 1 Foundations page = 10 new stories). Captured in #169; the HTML preview was a one-shot communication artifact, the Storybook expansion is the durable output.
- **Wave restructure.** Inserted a new **Wave 17 — Dog-food polish + sunset** ahead of Wave 14, on the basis that polish + the design-system gap close block clean v1.0 work. Added **Wave 18 — Plant detail passport IA** as a post-v1.0 wave consolidating the open #134-epic children + the dog-food-surfaced common-conditions polish. Order is now 17 → 14 → 15 → 16 → 18, with v1.0.0 tag at end of Wave 16.
- **GitHub milestones reorganised.** Created 7 wave-named milestones (Wave 14–18 + v1.1 backlog + v2 backlog), assigned all 33 open issues, closed 5 stale `v0.x` milestones (`v0.2`–`v0.6` were left over from waves 1–8). Convention: name milestones by wave, not version. v1.0.0 reserved for the launch tag.
- **Issue housekeeping.** [#1](https://github.com/tsipotU/plnt-trmnl/issues/1) (catalog tracking, "250+ species" goal) closed — exceeded at 444 species. [#148](https://github.com/tsipotU/plnt-trmnl/issues/148) retitled and body scoped to category-only (vacation half obsoleted by #166). 5 cross-link comments added on related-issue pairs.
- **In-app feedback DB updated.** 17 link-comments on this session's feedback rows (#21–#38), each pointing to its tracking GitHub issue with subsumption / bundling notes. 3 stale-open rows from 2026-04-26 (#18, #19, #20) flipped to `in_progress` with link-comments. The 17 historic 'done' rows left untouched. Feedback row #27 ("Hey ;)") deliberately left as `open` — it's a memento.
- **ROADMAP.md** updated to reflect the new wave ordering, with Wave 17 + Wave 18 sections added and vacation-mode references reduced to sunset-tracking only.

### Brand consolidation: `PLNT` → `p7l` (2026-05-06)

- **Wordmark renamed.** The user-facing brand token `PLNT` has been replaced everywhere it appears (Header, About page, Dashboard welcome, TrmnlSetup subtitle, PlantDetail Conditions copy, README headline, INSTALL title, `docs/conventions.md`). Test regexes in `Header.test.tsx`, `About.test.tsx`, and `Dashboard.test.tsx` updated to match.
- **Naming.mdx Foundations table** updated to reflect the new convention. The three project tokens are now: `plnt-trmnl` (codename / repo / package scopes), `p7l` (user-facing wordmark), `p7l-` (every CSS class in the design system). The wordmark and CSS prefix sharing the same numeronym root is now the *point* of the convention.
- **PR #151** — single squash merge, 14 files changed, 9 affected tests green.

### Roadmap additions (2026-05-06)

- **v1.1 backlog: Calendar subscription feed (`.ics`).** Surface the existing schedule machinery as a read-only iCalendar feed users can subscribe to in Apple Calendar / Google Calendar / Outlook. One per-user secret URL, events for upcoming waterings (and later: propagation milestones). Spec-light: serve `text/calendar` from `/api/calendar/<token>.ics`.
- **v2 backlog: Propagation guides + calendar-backed propagation projects.** Catalog gains per-species propagation profiles (seed, cutting, division, layering, air-layering, grafting). Users can start a "propagation project" that p7l walks them through phase-by-phase using the existing schedule/calendar machinery. Per profile: method, difficulty, expected success rate, time-to-viable-plant, seasonal window, source-plant prerequisites, materials list (incl. final pot + soil + fertilizer), step-by-step process, common failure modes. On success, the new plant becomes its own p7l entry.

### Repository public flip + branch protection (2026-05-05 → 2026-05-06)

- **History rewritten** via `git filter-repo --replace-text` to scrub leaked paths / IPs / references to private projects (baristi-v2, CampingHappy) before going public. Force-pushed to origin.
- **Repo renamed** from `plant-trmnl` → `plnt-trmnl` (level B: visible surface only). Operational identifiers (DB filenames, localStorage keys, Docker service names) preserved to avoid breaking running deployments.
- **Repo visibility flipped to public.** GitHub Pages source set to "GitHub Actions"; first Storybook build deployed to https://tsipotU.github.io/plnt-trmnl/.
- **Branch protection ruleset enabled** on `main`: require pull request, require status checks (`Client suite` + `API + renderer suite`), squash-merge only, no direct pushes.
- **Auto-merge enabled at repo level** (`allow_auto_merge=true`). `gh pr merge --auto --squash --delete-branch` now functions; armed PRs merge as soon as required checks turn green.
- **License clarified** — kept MIT (after critical review against AGPL / PolyForm Noncommercial). Added "Commercial use" community-norms section in README via PR #150 — non-binding asks for fork-back contributions, coordination on commercial products, and project credit.

### OSS-readiness batch (2026-04-26 → 2026-05-05)

- **Auth recovery CLI.** `npm run reset-auth` (in `packages/api/src/cli/reset-auth.ts`). Idempotent password reset that clears the stored hash + every active session, with `--password` / `--password-file` / `--database` / `--help` flags. INSTALL.md updated to point at it. Pure `resetAuth(db, password)` exported for tests; 5 unit tests cover insert / replace / sessions-cleanup / length-validation / empty-sessions.
- **Storybook GitHub Pages deploy.** New `.github/workflows/storybook.yml` builds the catalog and deploys to GitHub Pages on every push to `main`. Catalog now live at https://tsipotU.github.io/plnt-trmnl/.
- **Foundations cookbook (5 docs pages).** `Naming.mdx`, `Color.mdx`, `Accessibility.mdx`, `Theming.mdx`, `AddingAMolecule.mdx`. `@storybook/addon-themes` wired in `.storybook/main.ts` + `.storybook/preview.ts` for live light / dark toggling via `withThemeByDataAttribute`.
- **`docs/conventions.md`.** Agent-and-human conventions / gotchas reference, lifted from `CLAUDE.md` and reorganized by concern (DB & scheduling, auth, routing, frontend, renderer, assets / Docker). `CLAUDE.md` slimmed to a 27-line pointer with agent-specific gotchas only.
- **`docs/README.md`.** Index for the `docs/` directory (always-current vs wave-scoped vs append-only).
- **README + CONTRIBUTING rewrite.** Full rewrite per OSS-readiness outline (status, quickstart, Storybook URL, architecture diagram, doc-map table; CONTRIBUTING covers welcome + scope, local setup, repo layout, test conventions, filing issues / PRs, working with the design system + API + catalog).
- **`@legacy` JSDoc tags on 14 page-local components** in `packages/api/client/src/components/` — pre-catalog scaffolding marked so new code composes catalog primitives instead of extending the legacy components.
- **Plants list filters narrowed (#148, partial).** `StateFilter` trimmed to `'all' | 'due'` for v1.0; full filter rail (vacation + category) deferred to v1.1 — depends on server-side changes (`vacation` boolean per plant, LEFT JOIN catalog into `/api/plants` for `category`).
- **Pre-flip audit tightened.** `scripts/pre-flip-audit.sh` updated to leakier patterns (`/Users/admin`, `192.168.50.`, `sk-ant-`); `docs/archive/` and `scripts/` excluded from self-reference matches so the audit passed cleanly post-history-rewrite.

### Hotfixes — auth gate + image serving + Cloudflare hygiene (2026-04-26)

- **Auth gate scoped to `/api/*`.** The `requireAuth` middleware was applied at `app.use()` level with no path prefix, so it ran on every request — including the SPA shell, `/login`, and `/welcome`. Fresh devices with no session cookie hit `401 {"error":"Authentication required"}` at the root URL and could never reach the login form. Existing browsers worked only because their cookie from a past login satisfied the gate. The middleware now early-exits for any path that doesn't start with `/api/`; the SPA's own AuthGate handles client-side route protection. Auth test suite extended with three SPA-pass-through cases (`/`, `/login`, `/welcome`).
- **`app.set('trust proxy', 1)`.** Required behind the Cloudflare tunnel so `req.ip` / `req.secure` / `req.protocol` reflect the real client, not the Docker network. The session-cookie `secure` flag had its own `x-forwarded-proto` workaround already; this is hygiene for everything else (rate limiting, future audit logs).
- **Catalog images consolidated and Dockerfile-baked.** The monstera image rendered as a broken-image icon because `docker-compose.yml` mounted the legacy project-root `./assets` over `/app/assets`, shadowing the actual `catalog-images/` dir. Three changes: compose now mounts `./packages/api/assets`, the Dockerfile copies `assets/` into both build and runtime stages so production images are self-contained, and the legacy root `./assets/{ornaments,placeholder-plant.svg,seed-facts.json}` were `git mv`'d into `packages/api/assets/` so all assets live in one place. Backfilled `illustration_path` on the two existing Monstera plant rows that pre-dated Wave 9's catalog→plant copy on POST.

### Catalog expansion — 250 → 444 species (2026-04-26)

- **+194 catalog entries** added across all 12 categories. Per-category counts now: foliage 108, succulents 57, flowering 47, cacti 32, orchids 26, ferns/herbs/indoor_trees/palms/carnivorous/terrarium 25, air_plants 24. Every category meets the ≥25 minimum and the +50% growth target (foliage: 72→108, succulents: 38→57, flowering: 31→47, cacti: 21→32; air_plants/herbs/ferns/indoor_trees/orchids/palms/carnivorous/terrarium each grown to ≥25 from much smaller bases).
- **2,910 new unique facts** added (15 per entry, all globally unique against the existing 3,750). Catalog now carries 6,660 unique species facts in total.
- Notable additions: full Tillandsia diversity (bulbosa, fuchsii, magnusiana, velutina, tectorum, brachycaulos, etc.); collector-grade Philodendron / Monstera / Alocasia / Calathea cultivars (White Princess, Florida Ghost, Black Velvet, Frydek, Dragon Scale, musaica, ornata); long-overdue herb staples (lavender, marjoram, dill, fennel, tarragon, lemon balm, lemongrass, stevia, lemon verbena, hyssop, lovage, sorrel-style perilla, nasturtium); jewel orchids (Ludisia, Macodes), Paphiopedilum / Vanda / Miltoniopsis; Drosera / Sarracenia / Nepenthes / Pinguicula deepening; Lithops, Aeonium, Pachypodium, Euphorbia (obesa, tirucalli), Adenium, Senecio strings; Ficus benjamina/microcarpa/religiosa, citrus, olive, coffee for indoor_trees; Cycas/Zamia, Bismarckia, Bottle/Triangle palms; mosses, Cryptanthus, Bucephalandra, Anubias, Marsilea for terrarium/paludarium use.
- Implementation: 13 parallel sub-agents (one per category, foliage split into A+B halves) produced JSON entries against the schema; a global cross-batch validator confirmed zero slug/Latin/fact collisions before merge. Loader test (50 cases) and catalog/facts/conditions test suites (91 cases total) all pass against the new file. API rebooted clean against the strict-at-boot loader.

### Wave 13 — Plant detail structural rework (2026-04-26)

- **#134** Plant passport IA scaffolding: new `CollapsibleSection` primitive, image hero promoted to the top of the plant detail page, History section wrapped as a proof-of-concept. Full passport-order reorder of remaining sections deferred to child issues #139–#143 (reorder, hero redesign, "this plant" consolidation, sticky in-page nav, origin & lore narrative card).
- **#133** Common conditions UI: replaced ad-hoc inline rendering with the new `ConditionCard` primitive — identical-height collapsible cards with severity icons (⚠ warning, ℹ info), tag chips at fixed minimum width, optional `actionSlot` for the existing "Flag as active" interaction. Multiple cards can expand simultaneously. URL-persisted expand state intentionally dropped (diverges from issue AC) — local React state only.
- **#60** Calibration UX: explanation tooltip ("Why am I being asked this?") with first-visit pulse, "Calibration N of ~5" progress in modal title, calibration progress pill on plant detail Schedule section, 🌿 dialed-in badge on PlantCard. New `convergence_event` field on `POST /api/plants/:id/calibration` response (`'converged'` / `'drifted'` / `null`); new `calibration_converged` and `calibration_drift_detected` event types in `event_log`. CalibrationModal shows an inline transition message in its result card; CalibrationSequence flashes a brief banner above the next question. Drift detection uses the existing convergence reset logic (the algorithm auto-flips `is_converged` 1→0 on a non-3 answer); a richer "drift from mean" model is filed as a v1.1 follow-up.

### Wave 12 — Polish & feedback (2026-04-26)

- **Date strip (#126):** today is now rendered as a filled green tile with white text, while a separately-selected day uses a muted-fill + outline treatment — the two states look distinct. The strip now spans 11 days (5 back + today + 5 ahead) instead of 7-forward and auto-scrolls today into the centre on mount. New optional `?days=N` param on `GET /api/schedule/week` (default 7, range 1–30, back-compat).
- **Archive flow & memorial page (#135):** archiving a plant now navigates immediately to a new `/archive/:id` *in memoriam* page (no more 3-second delay before bouncing to a half-scrolled dashboard). The page hides the watering schedule, conditions, notes editor, archive button, and current pot size, and instead shows a stats grid (waterings, offspring, calibration cycles, lifespan), the cause, past-tense location, and a small Restore action. Visiting `/plants/:id` for an archived plant redirects to the memorial page. The archive index now links to memorial pages directly. `POST /api/plants/:id/restore` un-archives a plant, re-enables its species facts, and logs a `restored` event.

### Wave 9 — Hardening (2026-04-25)

- **Auth gate (#136):** New bootstrap-token + session-cookie auth on the API. Fresh installs must claim the instance via the `/welcome` page using a one-time setup token printed in the server logs. After bootstrap all `/api/*` routes (except `/api/auth/*` and `/api/feedback`) require a valid session. SPA `/login` page handles return visits. `scripts/reset-password.js` clears credentials offline. INSTALL.md documents the bootstrap flow.
- **Top-level `ErrorBoundary`** (no GH issue): wraps the app so an uncaught render error shows a friendly fallback with a Reload button instead of blanking the whole page.
- **Hamburger menu state polish (#124):** suppressed the iOS Safari blue tap-highlight + scoped focus styling to keyboard navigation only via `:focus-visible`.
- **Plant images on detail page (#132, monstera-only):** new `/api/illustrations/:filename` static endpoint. Catalog entries can now declare an `image_path`; the value is copied to `plants.illustration_path` on POST when a catalog match is found. First catalog image: a botanical illustration of *Monstera deliciosa Albo Variegata*. Plant detail page renders the image when present, falls back to the 🪴 emoji.
- **Stale "enrichment pending" UI hidden when no AI tool active (#131):** new `GET /api/system/ai-connection` heuristic (recent `enrichment_complete` event ⇒ "connected"). PlantCard hides the badge and PlantDetail swaps the wait banner for a "Connect an AI tool" CTA when no AI tool has been seen in the last 7 days.

### Changed
- **Architecture:** All in-process LLM calls removed. plnt-trmnl now exposes a pull-based enrichment API; users connect their own AI tool (Claude Desktop scheduled task, ChatGPT scheduled tasks, Cursor, Ollama + cron, n8n, etc.).
- **Catalog:** Expanded from 30 → 250 species across 12 categories (added `orchids`, `carnivorous`, `herbs`, `terrarium`). 60+ cultivars/variegated forms across major collector genera (Monstera, Pothos, Philodendron, Sansevieria, Ficus, Echeveria, Calathea, Aglaonema). Phalaenopsis migrated from `flowering` to its new `orchids` category.
- **Settings:** New "Connect your AI" section with a "Copy AI setup prompt" button that copies a ready-to-paste prompt teaching the user's AI which endpoints to call.

### Added
- `GET /api/plants?enrichment=pending` — list plants needing enrichment.
- `POST /api/plants/:id/enrichment` — receive enrichment payload (alias to the existing callback endpoint).
- `GET /api/conditions?care_update=pending` — list conditions awaiting care suggestions.
- `POST /api/conditions/:id/care-update` — receive AI-suggested care adjustment.
- `GET /api/facts/samples?n=10` — random facts as style anchors for the AI setup prompt.
- `INSTALL.md` — full install guide for newcomers.
- `ROADMAP.md` — forward plan (Waves 9–14).
- `docs/RELEASE-PROCESS.md` — maintainer playbook including the pre-public-flip checklist.
- `docs/archive/` — historical wave plans/designs/manual-tests for Waves 1–8 (moved out of the active `docs/plans/` and `docs/specs/` directories).
- `scripts/pre-flip-audit.sh` and `scripts/audit-issues.sh` — pre-publish hygiene tooling.

### Fixed
- **Calibration crash that blanked the entire app.** `GET /api/calibration/due` returned plants without their `question` field, but `CalibrationModal` reads `plant.question.question_text` directly. When a plant was due for calibration today and had no questions seeded (e.g. `enrichment_status = failed` from the legacy SDK era), the modal threw an uncaught `TypeError` and React unmounted the whole tree. The route now joins each due plant with its next calibration question and filters out plants that have none.

### Removed
- `@anthropic-ai/claude-agent-sdk` dependency.
- `packages/api/src/enrichment/claude-enrich.ts` (286 lines).

### Security
- N/A (auth on enrichment endpoints remains a known limitation, slated for v1.1.)

## [0.7.0] — 2026-04-25

### Removed
- n8n enrichment client (`webhook.ts`, `retry.ts` and their tests). The n8n env vars `N8N_ENRICHMENT_WEBHOOK_URL` and `N8N_ENRICHMENT_MAX_RETRIES` are no longer read.

### Fixed
- AddPlant post-add enrichment splash test flake (intermittent timeouts on `findByRole('dialog')`).

## [0.6.0] — 2026-04-24

### Changed
- App renamed to **PLNT** in user-visible copy.

### Added
- 🪴 favicon + PWA manifest (full PWA install lands in v1.1).
- Hamburger menu in top-nav with focus-trapped drawer, Escape close, backdrop click, route-change auto-close, body scroll lock.
- About page stub at `/about`.

### Removed
- Vacation toggle from Dashboard (UI-hidden; the underlying scheduling path and `/vacation-start` / `/vacation-end` routes remain functional).

## [0.5.0] — 2026-04-24

### Added
- Plant catalog foundation: 30 curated species with care, light profile, placement tips, 15 conditions, 15 facts, origin, lore, etymology.
- Catalog endpoints: `/api/catalog/search`, `/api/catalog/suggest`, `/api/catalog/entry`.
- AddPlant catalog dropdown with free-text fallback (#2).
- Rich care profiles (light, placement, top 15 conditions per species) on the plant detail page (#3).
- Daily fact rotation: TRMNL screen picks the least-recently-shown fact at 6 AM, resets when the species cycle is exhausted (#38).
- "Did you mean…" suggestion fallback for misspelled plant names (#39).
- "About this plant" card on detail page (#37).
- Settings page (`/settings`) with a "Show developer info" toggle.
- Conditions picker on plant detail with generic + species-specific sections (#75).
- Soil-feel seeds calibration when last-watered date is unknown (#70).
- Light-level help tooltip on AddPlant (#71).
- Image attachments on feedback submissions (#77).
- Post-add enrichment splash confirms species + care preview (#72).

### Changed
- Dry-soil-aware calibration: replaces the previous interval-tweak model with a `dry-days-target` semantic with growing-season (× 0.8) and dormancy (× 1.3) multipliers stacked multiplicatively with each plant's `heating_season_modifier` (#36).
- Prominent species header on the plant detail page (#74).

## [0.4.0] — 2026-04-23

### Added
- End-to-end watering lifecycle integration test covering Wave 2 features (#9).
- Archived plants view (#33).
- Plant origin story (purchased / received / seedling / unknown) with mother plant references (#35).
- Stats card + calibration trend UI on plant detail (#16).
- Timestamped notes log via a new `plant_notes` table (#32).

### Changed
- Condition resolve URL fix (#34).
- Vitest fork cap (`maxForks: 2`, `pool: forks`) after a second resource-exhaustion freeze; full post-mortem at `docs/incidents/2026-04-23-vitest-resource-exhaustion.md`.

### Removed
- Legacy `plants.notes` column (replaced by `plant_notes` table).

## [0.3.0] — 2026-04-22

### Added
- Batch water with batch undo toast (#11).
- 7-day calendar strip on Dashboard (#12).
- Pot size categories (Extra Small / Small / Medium / Large / Extra Large / Other) (#31).
- Bin-packer scheduling overflow / rebalance — every `next_water_date` mutation now goes through `scheduleNextWater` + `logScheduleEvents` (#6).
- Reason-specific memorial toasts on archive (#30).

### Changed
- Archive dialog CSS polish (#29).

### Fixed
- JSON render in event timeline (#25).
- Undo countdown stuck at 15s (#26).
- Watered button regression (#27).
- Flag-condition flow (#28).

## [0.2.0] — 2026-04-22

### Added
- Welcome empty state with first-plant hints + celebration toast (#13).
- Undo-water with 15-second window and full state restoration (#14).
- Seasonal modifier applied to scheduling (#15).
- Archive flow with reason / note / memorial UI (#17).

## [0.1.0] — 2026-04-22

### Added
- Plant identifier field (#10).
- Docker compose hygiene pass (#8).
- Feedback submission system with screenshot attachments (#19).

## [0.0.1] — 2026-04-07

### Added
- Initial scaffold: API container (`plant-api` :3900), renderer container (`plant-renderer` :3901), TRMNL webhook push integration, SQLite (WAL), Express 5, React 19 + Vite, Docker Compose.
