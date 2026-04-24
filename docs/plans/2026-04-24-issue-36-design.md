# Issue #36 — Dry-soil-aware calibration + seasonal multiplier (design note)

Status: design complete, implementation pending.
Scope: `packages/api/src/scheduling/`, `packages/api/src/routes/calibration.ts`, `packages/api/src/routes/plants.ts`, `packages/api/src/config.ts`, `.env.example`.

## Conceptual shift

Today the calibration loop targets a fixed **days-between-water** (`current_interval`, stored in days). The user rates how wet the soil felt on the scheduled watering day (1–5), and the interval is nudged up/down.

Issue #36 wants the same feedback loop, but reframed semantically: we target **N dry days between waterings** — i.e. "after a watering, we want soil to sit dry for N days before the next pour." The mechanic (1 answer → ±1 day → clamp) is identical; the _meaning_ of the number is "target dry-days window," not "arbitrary days-between."

Concrete consequence: because a watering typically wets the soil for a handful of days before it dries down to "needs water," the existing `current_interval` already behaves much like a dry-days target in practice. We therefore **reuse the existing `current_interval` column as the dry-days target**, rather than introduce a new column. The name on disk stays; the name in the code becomes `dry_days_target` at the boundary (a rename would balloon scope — see "Out of scope").

This keeps the existing calibration mechanic (answer 3 = just right, 1/2 = shorten, 4/5 = lengthen) pointing at the correct thing: answer 3 means "the N dry days I targeted were about right."

## Seasonal multiplier (new behaviour)

New knob family: a growing-season multiplier and a dormancy multiplier applied on top of `current_interval` when computing the _ideal_ `next_water_date`. `current_interval` itself is never mutated by the seasonal layer — only the computed ideal date changes, mirroring how `getSeasonalAdjustedInterval` already works for heating season.

Rules:
- If today is in the **growing season** window (`GROWING_SEASON_START` … `GROWING_SEASON_END`, inclusive): multiply effective target by `GROWING_SEASON_MULTIPLIER` (default `0.8` — shorter interval, more water).
- If today is NOT in the growing season: multiply by `DORMANCY_MULTIPLIER` (default `1.3` — longer interval, less water).
- The multiplier is rounded and clamped to ≥1 day, same as existing code.
- `DRY_DAYS_BASE` (default `7`) is the seed value for new plants pre-enrichment (replacing the hardcoded `currentInterval = 7` in `POST /api/plants`).

Why dormancy = "outside growing season" rather than a separate window: two windows (growing + dormancy) that don't cover the whole year would leave an ambiguous shoulder-season gap. Complement semantics (growing vs. the rest = dormancy) is simpler, and winter dormancy is the meaningful signal anyway.

## Interaction with the existing heating-season modifier

We have two seasonal surfaces today:

1. `HEATING_SEASON_*` (global config, month-day range, wraps year-end) + per-plant `heating_season_modifier` (REAL, default 1.0). **Applied only to the watering _interval_** today (`getSeasonalAdjustedInterval` in `seasonal.ts`). Also applied to water _volume_ in `water-calculator.ts`. Used via `waterPlant()`.
2. The new `GROWING_SEASON_*` + `DORMANCY_MULTIPLIER` + `GROWING_SEASON_MULTIPLIER` (global, no per-plant override at first).

**Chosen model: multiplicative stacking.** Both apply at the same layer (ideal-date computation in `waterPlant()` + `calibration.ts`). Order:

```
effectiveInterval = round(currentInterval * heatingModifier * growthOrDormancyMultiplier)
effectiveInterval = max(effectiveInterval, 1)
```

- `heatingModifier` = `heating_season_modifier` (per plant) when today ∈ heating season, else 1.0.
- `growthOrDormancyMultiplier` = `GROWING_SEASON_MULTIPLIER` if today ∈ growing season else `DORMANCY_MULTIPLIER`.

Rationale:
- Heating season and growing season are **conceptually orthogonal** — heating is about indoor air dryness (we're in central-heated Europe, the air strips moisture), growing/dormancy is about plant physiology. They can both be true at once (e.g. March = still heating, early growth) and should stack.
- In the default config (heating Oct–Apr, growing Apr–Sep) the overlap window is narrow (Apr 1 boundary) so stacking almost never compounds aggressively — but when it does, it compounds in the correct direction.
- Per-plant `heating_season_modifier` remains the species-specific knob; the new global multipliers are the ambient-climate knob. Cleanly separated.

Flag for reviewer scrutiny: an alternative is "highest-priority wins" (heating modifier overrides growing-season multiplier, or vice-versa). Stacking was chosen as the most defensible default because it preserves both signals and matches how the underlying physiology actually combines. If reviewers prefer override semantics, the change is localised to the new helper and well-tested — easy to flip.

Only one `seasonal_adjustment` event is logged per watering (as today). The event `reason` string will enumerate which layers fired (heating, growing, dormancy), so the audit trail is intelligible.

## New config knobs (added to `Config` + `.env.example`)

| Key | Default | Validation |
|-----|---------|------------|
| `GROWING_SEASON_START` | `04-01` | `MM-DD` format |
| `GROWING_SEASON_END` | `09-30` | `MM-DD` format |
| `DRY_DAYS_BASE` | `7` | positive integer, clamped ≥2 |
| `DORMANCY_MULTIPLIER` | `1.3` | positive float, clamped >0 |
| `GROWING_SEASON_MULTIPLIER` | `0.8` | positive float, clamped >0 |

Invalid values fall back to defaults with a warning (matches existing `parseMonthDay` tolerance). Env-var naming matches the existing `HEATING_SEASON_START/END` pattern for operator muscle memory.

## Migration story

No schema change. `current_interval` already exists (INTEGER) and already holds what is now the "dry-days target" for every active plant. On first load after deploy:
- New plants created post-deploy: seeded from `DRY_DAYS_BASE` instead of hardcoded `7`. The existing enrichment flow still overwrites this once Claude responds.
- Existing plants: `current_interval` stays as-is — it's already a reasonable dry-days target (it was calibrated against the same mechanic). No backfill migration needed.

This keeps blast radius zero on the DB side and avoids risky retroactive recalculation.

## The `scheduleNextWater` funnel — unchanged

Every `next_water_date` write path continues to go through `scheduleNextWater(idealDate, location, existing)` + `logScheduleEvents(db, plantId, result)`. The only change is **how `idealDate` is computed**: the seasonal layer now returns `round(interval × heatingModifier × growthOrDormancyMultiplier)` instead of `round(interval × heatingModifier)`.

Funnelled call sites (per CLAUDE.md gotcha) and their update:
- `routes/plants.ts` → `waterPlant()` — gains growing/dormancy multiplier via new `applySeasonalMultipliers()` helper
- `routes/plants.ts` → `PUT /:id` repot branch — unchanged (doesn't need seasonal; repot adjustment is its own axis)
- `routes/calibration.ts` — unchanged (uses raw `newInterval` post-calibration; seasonal is applied on the _next_ water event, not retroactively)
- `enrichment/callback.ts`, `enrichment/claude-enrich.ts` — unchanged (both call `calculateNextWaterDate(lastWateredAt, base_interval)` for an initial placeholder; the seasonal layer kicks in on the next water)
- `scheduling/vacation.ts` — unchanged

Overflow / congested events continue to fire from `logScheduleEvents` unchanged.

## Impact on calibration events

Event payloads stay the same shape. The `seasonal_adjustment` event's `reason` string is extended: instead of

```
Heating season active; interval 7 → 5 (×0.7)
```

it now reads (example)

```
Seasonal adjustment: interval 7 → 4 (heating ×0.7, growing ×0.8)
```

New event _types_ are not introduced — we keep one `seasonal_adjustment` event per watering. The reason string is the migration-friendly way to surface layered info. Batch / undo isolation semantics remain identical (`seasonal_adjustment` is IN the batchId; overflow_rebalance / schedule_congested are NOT).

## Calibration convergence

Unchanged — convergence still triggers on 3 consecutive answer-3s. The semantic shift (dry-days vs. days-between) doesn't change the convergence criterion because the user-facing question is now phrased around dry soil (UI copy work is out-of-scope per issue, but code-side the calibration.ts logic is identical: we're just pointing `current_interval` at the right concept).

## Test plan (TDD, tests first)

1. `scheduling/seasonal.test.ts` — extend:
   - `isInGrowingSeason(today, config)` boundary tests (mirror `isInHeatingSeason`)
   - `applySeasonalMultipliers(baseInterval, perPlantHeatingModifier, today, config)` covering: growing season only, dormancy only, heating only, heating + growing stacked, heating + dormancy stacked, all-off, clamps to ≥1
2. `config.test.ts` — new knobs load, validation, defaults
3. `scheduling/calibration.test.ts` — new-name tests for `adjustInterval` semantics (re-phrase comments to "dry days" — no behaviour change)
4. `routes/plants.test.ts` — water a plant in growing season vs dormancy, assert `next_water_date` differs per multiplier; assert `seasonal_adjustment` event fires with correct reason; assert `scheduleNextWater` funnel still engaged (overflow / congested events still log)
5. `routes/calibration.test.ts` — no behavioural changes; existing tests continue to pass

## Out of scope (tracked, not shipped)

- Column rename `current_interval → dry_days_target` — mechanical sqlite rename, invasive, cosmetic. Rename targeted at a follow-up.
- UI copy update to explain dry-days semantic to end users.
- Real temperature sensor integration — explicitly marked future work by issue.
- Per-plant override of growing/dormancy multipliers — global suffices for v1.
