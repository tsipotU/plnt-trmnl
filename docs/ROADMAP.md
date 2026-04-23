# Plant TRMNL — Roadmap

Forward-looking work, organized by "wave" (a cohesive batch of related issues shipped together). Waves 1-3 are complete; see commit history and closed issues for what landed.

Issues live at [github.com/tsipotU/plant-trmnl/issues](https://github.com/tsipotU/plant-trmnl/issues). This document tracks **intent**; the issues themselves carry the acceptance criteria and the final word on scope.

## Wave 4 — Timeline polish, visuals, E2E (next)

- **[#5](https://github.com/tsipotU/plant-trmnl/issues/5) Botanical illustration pipeline per species** — visual polish for TRMNL cards
- **[#9](https://github.com/tsipotU/plant-trmnl/issues/9) End-to-end watering lifecycle validation** — integration smoke tests including Wave 2/3 features
- **[#16](https://github.com/tsipotU/plant-trmnl/issues/16) Watering history & plant health timeline (UI)** — API shipped in #20; UI missing
- **[#32](https://github.com/tsipotU/plant-trmnl/issues/32) Notes: timestamped log** — replaces single-textarea notes with a `plant_notes` table
- **[#33](https://github.com/tsipotU/plant-trmnl/issues/33) Archived plants view** — read-only listing of archived plants
- **[#34](https://github.com/tsipotU/plant-trmnl/issues/34) Condition remediation** — track resolution; pairs with the deferred #28 Flag-Condition flow
- **[#35](https://github.com/tsipotU/plant-trmnl/issues/35) Plant origin story** — purchase/gift/seedling tracking

## Wave 5 — Catalog + intelligence

- **[#1](https://github.com/tsipotU/plant-trmnl/issues/1) Plant catalog** — 250+ houseplant database with searchable dropdown (blocks #2, #3, #4, #5, #37, #39)
- **[#2](https://github.com/tsipotU/plant-trmnl/issues/2) Streamlined add-plant flow** — dropdown-first with free-text fallback
- **[#3](https://github.com/tsipotU/plant-trmnl/issues/3) Rich care profiles** — light, placement, top 15 conditions per species
- **[#4](https://github.com/tsipotU/plant-trmnl/issues/4) Plant-specific fact generation on add** — 25 LLM-generated facts per new species (pairs with #38)
- **[#36](https://github.com/tsipotU/plant-trmnl/issues/36) Dry-soil-aware calibration** — algorithm rethink; may defer to Wave 6
- **[#37](https://github.com/tsipotU/plant-trmnl/issues/37) Deep plant info on detail page** — names, origin, lore
- **[#38](https://github.com/tsipotU/plant-trmnl/issues/38) Plant facts: daily rotation on TRMNL** — mark-as-shown tracking, reset when pool empties, TRMNL-only surface
- **[#39](https://github.com/tsipotU/plant-trmnl/issues/39) Enrichment fallback** — did-you-mean suggestions when species unknown

## Wave 6 — Design + deferred

- **[#7](https://github.com/tsipotU/plant-trmnl/issues/7) TRMNL template visual redesign** — match Lovable mockups
- **[#18](https://github.com/tsipotU/plant-trmnl/issues/18) Auto-detect conditions from calibration patterns**
- **[#40](https://github.com/tsipotU/plant-trmnl/issues/40) Frontend design pass** — holistic web client UI refresh

## Wave 3 follow-ups (captured during review, to be slotted)

Non-blocking items surfaced during per-PR quality reviews. None are on the critical path; pick them up when they're the cheapest open work.

1. Surface errors in `useWeekSchedule` instead of silent empty state
2. Collapse vacation-end congestion-event bursts into a summary event
3. Parallelize `CalibrationSequence` question fetch with `Promise.all`
4. Type `getEventsForPlant` return value (remove `any[]`)
5. Bin-pack the initial schedule on `POST /api/plants` (currently waits for enrichment)
6. Drop `AddPlant`'s implicit 20cm pot-size default when no size picked

## Open design questions

- **Community distribution.** Evaluating public release strategy (Docker Hub / GHCR multi-arch images, public GitHub repo). Depends on a hardcoded-secrets audit and a CI build pipeline. See README for status.
- **Calibration rewrite (#36) vs. catalog (#1) ordering.** #36 is the most disruptive change in Wave 5. Current working assumption: ship it last, or isolate on a branch.

## Shipping history (brief)

- **Wave 1** (shipped): core build, DB + API + renderer + TRMNL push pipeline, enrichment, plant identifiers (#10), feedback system (#19)
- **Wave 2** (shipped 2026-04-22): paginated events endpoint (#20), archive with reason + memorial (#17/#21), undo-water (#14/#22), seasonal modifier (#15/#23), welcome empty state (#13/#24)
- **Wave 3** (shipped 2026-04-22 → 2026-04-23): 11 PRs — multi-plant overflow/rebalance (#6), batch watering (#11), 7-day calendar strip (#12), pot size categories (#31), memorial toast variants (#30), archive dialog polish (#29), reason-specific timeline hides (#25), hide Flag Condition (#28), button copy (#27), 15s undo (#26), client-side vitest infrastructure
