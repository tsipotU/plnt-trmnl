# Plant TRMNL — Design Specification

**Date:** 2026-04-07
**Author:** Emiel + Claude
**Status:** Draft

## Overview

Plant TRMNL is a plant care management system that displays watering schedules, care instructions, and plant facts on a TRMNL e-ink screen (800x480px, 4-level grayscale). A companion web app (mobile-first, iPhone 15 Pro) handles plant management, calibration input, and condition tracking.

The system uses a self-calibrating algorithm that learns each plant's watering needs over time through daily check-in questions.

## Architecture

### Two-Container Split (OrbStack, Docker Compose)

| Container | Tech | Port | Role |
|-----------|------|------|------|
| `plant-api` | Express + SQLite (WAL mode) | 3900 | Web UI, REST API, scheduling engine, calibration logic, n8n integration, enrichment retry queue, backup cron, event log |
| `plant-renderer` | Express (stateless) | 3901 | Daily cron renders TRMNL screen markup, pushes to TRMNL via webhook API, serves local preview endpoint |

### Render Pipeline (Once Daily)

The renderer runs a daily cron at 05:00 (Europe/Amsterdam). It queries the API for today's screen state, renders HTML markup, and pushes it to TRMNL's webhook API. The renderer also caches the result locally for the web app's TRMNL Preview page.

```
05:00 daily cron
  └── plant-renderer queries plant-api (internal Docker network)
       └── API returns today's screen data (plants due, facts, overdue, calibration questions)
            └── Renderer builds HTML markup
                 ├── Pushes to TRMNL webhook API (https://usetrmnl.com/api/custom_plugins/<uuid>/push)
                 └── Caches locally for preview endpoint (renderer:3901/preview)
```

**Why webhook push, not polling:** TRMNL's polling happens from their cloud servers, not the device itself. Polling would require exposing the renderer to the internet, contradicting the "local network only" security decision. Webhook push keeps everything behind the firewall — the renderer pushes outbound to TRMNL's API, no inbound connections needed.

**Exception:** Adding a new plant mid-day does not trigger a re-render. It appears on the screen the next day.

### External Integrations

- **TRMNL** — receives daily screen push from renderer via TRMNL webhook API (outbound HTTPS, no inbound exposure needed)
- **n8n** — webhook called by `plant-api` on plant creation for enrichment (plant data + calibration questions + facts + botanical illustration via Claude Max)
- **SQLite** — single DB file, Docker volume mount, WAL mode for safe reads

### Security

- All secrets in `.env` file: TRMNL API key, n8n webhook URL, internal auth token, style reference path
- Validated on startup — app refuses to start if required vars are missing (same pattern as Baristi `config.ts`)
- Renderer preview endpoint on local network only (no external exposure)
- TRMNL integration via outbound webhook push — no inbound ports exposed to internet
- Docker internal network for container-to-container traffic
- Web UI accessible on local network only (no Cloudflare tunnel)
- No hardcoded API keys, tokens, or secrets anywhere in the codebase

### Reliability

- `/health` endpoint on both containers, wired into Docker Compose `healthcheck` with restart policy
- Daily SQLite backup cron → `~/Backups/plant-trmnl/` (outside container)
- `TZ=Europe/Amsterdam` on both containers
- Structured JSON logging to stdout/stderr
- Enrichment retry queue: persisted in SQLite, retried every 15 min until success

## Data Model

### plants

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| name | TEXT | Display name, e.g., "Monstera" |
| common_name | TEXT | Common name |
| species | TEXT | Latin name, e.g., "Monstera deliciosa" |
| pot_size_cm | INTEGER | Pot diameter in cm |
| plant_size | TEXT | "small" / "medium" / "large" |
| location | TEXT | e.g., "living room east window" |
| light_level | TEXT | "low" / "medium" / "bright_indirect" / "direct" |
| base_interval | INTEGER | Days between watering (from enrichment) |
| current_interval | INTEGER | Calibrated interval (adjusts over time) |
| water_ratio | REAL | Plant-type water ratio for volume calculation |
| water_description | TEXT | Practical watering guidance, e.g., "about 1.5 cups" or "soak until water drains" |
| last_watered_at | DATETIME | When the plant was last watered (set during Add Plant flow) |
| next_water_date | DATE | Calculated next watering date |
| fertilizer_interval_weeks | INTEGER | e.g., every 4 weeks during growing season |
| last_fertilized_at | DATETIME | When last fertilized |
| heating_season_modifier | REAL | Multiplier for Oct 1 – Apr 1 interval adjustment |
| illustration_path | TEXT | Path to botanical line art PNG |
| calibration_cycle | INTEGER | Counter for rotation (default 0, increments each watering) |
| is_converged | BOOLEAN | True after 3 consecutive "3" calibration answers (default false) |
| enrichment_status | TEXT | "pending" / "complete" / "failed" |
| archived | BOOLEAN | Soft-delete flag (default false) |
| archived_at | DATETIME | When archived |
| notes | TEXT | Free-text notes |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### calibration_questions

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| plant_id | FK → plants | |
| question_text | TEXT | e.g., "How wet is the soil?" |
| question_type | TEXT | "soil_moisture" / "leaf_firmness" / "droopiness" / "tip_condition" |
| scale_min_label | TEXT | e.g., "Bone dry" |
| scale_max_label | TEXT | e.g., "Soaking wet" |
| display_order | INTEGER | Rotation order |
| created_at | DATETIME | |

### calibrations

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| plant_id | FK → plants | |
| question_id | FK → calibration_questions | |
| answer_value | INTEGER | 1-5 scale |
| interval_before | INTEGER | Interval before adjustment |
| interval_after | INTEGER | Interval after adjustment |
| created_at | DATETIME | |

### plant_conditions

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| plant_id | FK → plants | |
| condition_name | TEXT | e.g., "yellowing leaves", "root rot" |
| symptoms | TEXT | Description of symptoms |
| remedy | TEXT | How to fix it |
| severity | TEXT | "info" / "warning" / "critical" |
| is_active | BOOLEAN | Currently affecting the plant? |
| detected_via | TEXT | "calibration" / "manual" |
| resolved_at | DATETIME | |
| created_at | DATETIME | |

### facts

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| plant_id | FK → plants (nullable) | null = general fact |
| text | TEXT | The fact text |
| source | TEXT | "seed" / "enrichment" |
| shown_count | INTEGER | Times shown (default 0) |
| is_disabled | BOOLEAN | Downvoted by user (default false) |
| created_at | DATETIME | |

Fact rotation: `SELECT * FROM facts WHERE is_disabled = false ORDER BY shown_count ASC, RANDOM() LIMIT 1`. Increment `shown_count` after display. When all active facts have equal `shown_count`, the cycle effectively resets.

Seed 150 facts on first run (buffer of 30 for replacements when facts are downvoted).

### decorative_ornaments

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| image_path | TEXT | Path to ornament PNG |
| shown_count | INTEGER | Times shown (default 0) |
| created_at | DATETIME | |

8-10 decorative botanical ornaments, rotated independently from facts using same `shown_count` logic. Static assets shipped with the app.

### event_log

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| plant_id | FK → plants (nullable) | |
| event_type | TEXT | See event types below |
| old_value | TEXT (nullable) | |
| new_value | TEXT (nullable) | |
| reason | TEXT | Human-readable explanation |
| created_at | DATETIME | |

Event types: `watered`, `calibration`, `schedule_change`, `fertilized`, `condition_detected`, `condition_resolved`, `enrichment_complete`, `enrichment_failed`, `overflow_rebalance`, `archived`, `fact_disabled`, `vacation_start`, `vacation_end`.

### enrichment_queue

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| plant_id | FK → plants | |
| status | TEXT | "pending" / "in_progress" / "complete" / "failed" |
| attempts | INTEGER | Default 0 |
| last_attempt_at | DATETIME | |
| error_message | TEXT (nullable) | |
| created_at | DATETIME | |

### app_state

| Column | Type | Description |
|--------|------|-------------|
| key | TEXT PK | |
| value | TEXT | JSON-encoded |
| updated_at | DATETIME | |

Used for: `vacation_until` (date or null), `last_render_date`, `heating_season_start` (default "10-01"), `heating_season_end` (default "04-01").

## TRMNL Screen Design

### Screen States

Two primary states, rendered once daily at 05:00.

#### 1. Watering Day

Shown when 1 or 2 plants need watering today.

**Layout (per Lovable mockups — canonical references):**
- Dark header bar: "Plant TRMNL" (left), date (right)
- 1 or 2 plant cards (1 card = centered, 2 cards = side by side)
- Each card contains:
  - Large botanical line art illustration (hero element, ~50% of card area)
  - Plant name (large, bold, serif)
  - Species name (italic)
  - Location + pot size
  - Water amount in ml + practical description (e.g., "350ml — about 1.5 cups")
  - Fertilizer: Yes/No
  - "Watch for" condition badge
  - Calibration box: specific question (rotated per watering cycle), 1-5 scale with labels, "Answer in app before 12:00"
- Footer: "Next: [plant name] — [date] · every [X] days"

**1-plant reference:** `/Users/admin/Downloads/trmnl-1-plant-BjV-4oWY.png`
**2-plant reference:** `/Users/admin/Downloads/trmnl-2-plants-Bn2iYAZV.png`

#### 2. Rest Day

Shown when no plants need watering (or vacation mode is active).

**Layout:**
- Dark header bar (same)
- Decorative botanical ornament (rotated from library of 8-10)
- Large serif plant fact text (centered, readable from 1m)
- Divider line
- "NEXT WATERING" section: plant thumbnail + name + date + interval
- If plants are overdue: dark pill badge showing most urgent first. Single overdue: "Overdue: Pothos (3 days)". Multiple: "Overdue: Pothos (3 days) +2 more" — positioned between fact and next watering section

**Normal rest day reference:** `/Users/admin/Downloads/trmnl-rest-day-DTZXFqYo.png`
**Overdue rest day reference:** `/Users/admin/Downloads/trmnl-rest-day-overdue-CQA6HVEc.png`

### Max 2 Cards Per Day

If 3+ plants are due on the same day, the scheduler spreads them using bin-packing (see Scheduling Algorithm). The screen never shows more than 2 cards.

## Scheduling Algorithm

### Water Amount Calculation

```
pot_volume_ml = π × (pot_size_cm / 2)² × estimated_depth_cm
water_amount_ml = pot_volume_ml × water_ratio × season_modifier
```

- `water_ratio`: plant-type specific (from enrichment), typically 0.02–0.05 range. E.g., Monstera = 0.035 (~350ml for 25cm pot), Snake Plant = 0.012 (~120ml for 15cm pot). The enrichment prompt must specify this range to avoid absurd values — a 25cm pot has ~10L total volume, so ratios above 0.05 produce unrealistic amounts.
- `season_modifier`: heating season (Oct 1 – Apr 1) → volume × 0.85 (less uptake), but interval may shorten (drier air from heating)
- `estimated_depth_cm`: `pot_size_cm × 0.85` (standard nursery pot proportions — depth ≈ 85% of diameter)

### Interval Calibration Loop

All scheduling queries filter `WHERE archived = false`. Archived plants are completely excluded from the scheduling engine, bin-packing, and TRMNL screen rendering.

1. Enrichment sets `base_interval` (e.g., Monstera = 7 days)
2. `current_interval` starts equal to `base_interval`
3. On watering day, TRMNL shows a calibration question (rotated from 2-3 question types per plant)
4. User answers 1-5 in web app before deadline (default 12:00)
5. Algorithm adjusts `current_interval`:
   - Answer 1-2 (very dry/dry) → shorten by 1 day (minimum 2 days)
   - Answer 3 (just right) → keep interval; mark as "converged" after 3 consecutive 3s
   - Answer 4-5 (wet/soaking) → extend by 1-2 days
6. If no answer by deadline → assume "3" (no change), log as "skipped calibration"
7. After watering (user clicks "Mark as watered" in web app), recalculate `next_water_date` from today

### Calibration Question Rotation

Each plant has 2-3 calibration question types (from enrichment):
- Soil moisture (universal)
- Plant-specific indicator (e.g., leaf droopiness for Peace Lily, leaf firmness for succulents, tip crispiness for Ferns)

Questions rotate per watering cycle: cycle 1 = soil moisture, cycle 2 = leaf indicator, cycle 3 = soil moisture, etc. Tracked via `calibration_cycle` counter on the plant.

### Calibration Convergence

After 3 consecutive "3" (just right) answers, the plant is marked `is_converged = true`:
- **TRMNL card:** calibration box is replaced with a simple "Soil: dialed in" note, freeing card space
- **Web app:** calibration modal appears every 3rd watering instead of every watering
- **Re-entry:** any non-3 answer resets `is_converged = false` and returns to every-watering calibration
- This rewards dialed-in plants with less friction while keeping the feedback loop active

### Condition Detection Rules

Patterns detected from calibration history:
- 3 consecutive "5/soaking" → flag possible overwatering, suggest reducing frequency
- 3 consecutive "1/bone dry" → flag possible underwatering or root-bound, suggest increasing frequency or repotting
- Calibration + "Watch for" trigger: e.g., soil consistently wet + droopy leaves → flag root rot

User can also manually flag conditions via the web app.

### Bin-Packing (Max 2 Per Day)

When calculating `next_water_date`:
1. Compute ideal date from `last_watered_at + current_interval`
2. Check how many plants are already scheduled for that date
3. If ≥ 2 plants already scheduled:
   - Prefer shifting to an adjacent day (±1, then ±2, up to ±3 max)
   - **Location-aware grouping:** prefer the day that already has a plant in the same room (water all living room plants together)
4. Priority: shorter-interval plants get their preferred dates; longer-interval plants flex

### Repotting Recalculation

When `pot_size_cm` is changed in the web app (repotting):
- Water amount recalculates automatically (larger pot = more water)
- `current_interval` gets a one-time adjustment: `new_interval = current_interval × (new_pot_volume / old_pot_volume) ^ 0.3` — a dampened scaling factor because a bigger pot holds more moisture (longer between waterings), but the relationship isn't linear
- `is_converged` resets to `false` — calibration resumes every watering to re-learn the new pot dynamics
- Event logged: `schedule_change` with reason "repotted from Xcm to Ycm"

### Fertilizer Schedule

- `fertilizer_interval_weeks` from enrichment (e.g., every 4 weeks)
- During heating season (Oct 1 – Apr 1): no fertilizer (most houseplants dormant)
- On watering days where fertilizer is due: card shows "Fertilizer: Yes"
- Tracked independently via `last_fertilized_at`

### Vacation Mode

- Toggle in web app: "Away until [date]"
- While active:
  - TRMNL shows rest day screens (no watering prompts, no overdue badges)
  - Scheduling paused — no new overdue markers accumulate
- **"End vacation early"** button visible while vacation is active — triggers the same return-date logic immediately
- On return (scheduled date or early end):
  - Recalculate all `next_water_date` values from return date
  - Bin-pack to spread plants across first few days back (no "5 plants overdue" dump)
  - Log `vacation_end` event

## Web App (Management UI)

### Platform

- React (Vite) + TypeScript
- Served by `plant-api` container
- Mobile-first: iPhone 15 Pro (393×852 viewport)
- Dark theme, minimal UI

### Pages

#### Dashboard
- List of all active plants with status badges:
  - Next watering date
  - Overdue indicator (days overdue, red badge)
  - "Enrichment pending" badge
  - Active condition warnings
- Tap plant → plant detail
- "Add Plant" button (prominent)
- Vacation mode toggle (top bar)
- Archived plants in collapsed section at bottom

#### Plant Detail
- All plant info (editable fields)
- Botanical illustration (large)
- Event timeline (scrollable, most recent first)
- Calibration history chart: interval over time (line chart showing convergence)
- Active conditions list with "Mark resolved" action
- "Mark as Watered" button (primary action — triggers `next_water_date` recalculation)
- "Archive Plant" action (soft-delete, confirmation required). Archived plant's 15 facts remain in the fact pool (they're interesting regardless of whether you still own the plant).

#### Add Plant
1. Type plant name in search field
2. System fires n8n webhook for enrichment
3. Loading state: "Enriching [plant name]..." with spinner
4. On success: pre-filled form appears (all fields from enrichment)
5. User adjusts: pot size, location, plant size, light level
6. **"When did you last water this plant?"** — date picker (default: today). Options: specific date, "Today", or "I don't know" (defaults to yesterday, so first watering is scheduled for tomorrow and calibration starts immediately)
7. Save → `last_watered_at` set from step 6, `next_water_date` calculated as `last_watered_at + current_interval`, plant added to schedule, facts added to pool
8. On enrichment failure: form shown with empty fields, user can fill manually. Retry queue active in background.

#### Calibration Popup
- On watering days, when opening the app: sequential modals, one per plant due today
- Each modal: plant name + illustration thumbnail, the calibration question, slider or number picker (1-5) with labeled endpoints
- Submit → schedule adjusts → confirmation with new interval → "Next plant" or "Done"
- Dismissable per plant (skip = assume "3")
- For converged plants (see Calibration Convergence): modal appears every 3rd watering only

#### Conditions
- Flag a condition manually: pick from enriched common conditions list, or write custom
- Set severity (info/warning/critical)
- "Watch for" on TRMNL card pulls from active conditions
- Mark as resolved → logs event

#### Fact Management
- List of all facts (searchable)
- Thumbs-down to disable a fact (removed from rotation, not deleted)
- Shows source (seed/enrichment) and plant association
- Count of times shown

#### TRMNL Preview
- Shows exactly what the e-ink screen currently displays (today's cached render)
- Useful for debugging and checking what TRMNL will show

### "Mark as Watered" Flow

This is separate from calibration. The user can:
1. Answer calibration (optional) → adjusts interval
2. Mark as watered (explicit action) → records `last_watered_at`, recalculates `next_water_date`

This handles edge cases: watering without calibration, watering a day early, someone else watering your plants.

## n8n Enrichment Pipeline

### Trigger

Webhook POST from `plant-api` when a new plant is added.

### Payload

```json
{
  "plant_name": "Monstera Deliciosa",
  "pot_size_cm": 25,
  "plant_size": "large",
  "location": "living room",
  "light_level": "bright_indirect",
  "callback_url": "http://plant-api:3900/api/enrichment/callback"
}
```

### n8n Workflow Steps

1. **Receive webhook** → extract plant info
2. **Call Claude Max** with enrichment prompt → returns structured JSON:
   - `base_interval` (days)
   - `water_ratio` (0.0-1.0)
   - `water_description` (practical guidance, e.g., "about 1.5 cups")
   - `fertilizer_interval_weeks`
   - `heating_season_modifier`
   - `calibration_questions[]` (2-3 question types with text, type, scale labels)
   - `common_conditions[]` (name, symptoms, remedy, severity — top 5-8)
   - `facts[]` (15 plant-specific facts)
   - `watch_for` (default condition to show on card)
3. **Generate botanical illustration** — call image generation API with:
   - Text prompt describing the specific plant
   - **Style reference image** (`assets/style-reference.png`) as input for consistency
   - Target: high-contrast black line art on white, crosshatch botanical style, 400×400px
4. **Callback to plant-api** with full enrichment result + illustration file
5. API stores everything, updates `enrichment_status` to "complete"

### Style Reference Strategy

A single canonical style reference image (`assets/style-reference.png` — derived from the Lovable mockup illustrations) is included in every image generation request. This anchors the visual style across all plants added over time, preventing style drift.

### Fallback

- If n8n is unreachable: plant saved with `enrichment_status: 'pending'`
- Enrichment retry queue checks every 15 min, up to 10 attempts
- Web UI shows "Enrichment pending" badge
- User can manually fill all fields as fallback
- After 10 failed attempts: status set to "failed", user notified

## Frameworks (Adapted for Plant TRMNL)

### GOTCHA — Project Structure (light)

| Layer | Adaptation |
|-------|-----------|
| **G** — Goals | 3 goal docs in `.agents/goals/`: `build-app.md` (ATLAS), `manage-project.md` (GROOM), `qa.md` (FINE) |
| **O** — Orchestration | Docker Compose (container orchestration) |
| **T** — Tools | n8n webhook (enrichment), TRMNL API (display) |
| **C** — Context | Plant database, event log, fact pool |
| **H** — Hard Prompts | n8n enrichment prompt template, illustration style reference |
| **A** — Args | `.env` + `config.ts` (validated env vars) |

### ATLAS — Build Workflow (full)

1. **Architect** — Define the feature, success criteria
2. **Trace** — Data schema, API contracts, n8n webhook shape, TRMNL polling contract
3. **Link** — Validate all connections (API↔renderer, API↔n8n, renderer↔TRMNL, SQLite volume)
4. **Assemble** — Build in layers (database → API → web UI → renderer → integration)
5. **Stress-test** — Unit tests, integration tests, edge cases
6. **+Validate** — Security review (no hardcoded secrets, token auth, input sanitization)
7. **+Monitor** — Health checks, event log, Docker restart policies, backup verification

### GROOM — Project Management (full)

GitHub issues + milestones. Gather → Review → Overlay → Opine → Make changes.

### FINE — QA Gate (adapted for mobile web)

1. **Flows** — Touch targets ≥44px, calibration modal reachable one-handed, plant list scrollable
2. **Inspect** — Enrichment failure states, empty plant list, network errors
3. **Navigate** — ARIA labels, focus management on modals, contrast ratios (dark theme)
4. **Exit** — All flows completable on iPhone Safari, no regressions

### ORBIT — Infrastructure (adapted, no K8s)

1. **Observe** — Health endpoints, Docker container status, event log
2. **Rig** — Docker Compose, volume mounts, network config, OrbStack
3. **Build** — Dockerfiles, backup cron, environment config
4. **Instrument** — Health check wiring, restart policies, structured logging
5. **Test** — Container restart recovery, backup restore test, stale cache behavior

### 12-Factor Compliance

| Factor | Implementation |
|--------|---------------|
| 1. Codebase | One repo (`plant-trmnl`), tracked in git |
| 2. Dependencies | Explicit in `package.json` per container |
| 3. Config | `.env` file, validated on startup |
| 4. Backing services | SQLite as attached resource (volume mount) |
| 5. Build/release/run | Docker multi-stage builds |
| 6. Processes | Renderer stateless; API stateful (SQLite) |
| 7. Port binding | 3900 (API), 3901 (renderer) |
| 8. Concurrency | Container-level scaling |
| 9. Disposability | Fast startup, graceful shutdown |
| 10. Dev/prod parity | Same Docker Compose for dev and production |
| 11. Logs | stdout/stderr, structured JSON |
| 12. Admin processes | Backup cron, enrichment retry as scheduled tasks |

## Project Setup

### GitHub Repository

- **Repo name:** `plant-trmnl`
- **Visibility:** Private
- README with project overview, architecture diagram, setup instructions
- `.gitignore` for Node.js, Docker, `.env`, `.superpowers/`
- Branch protection on `main`
- GitHub Issues + Milestones for project management (GROOM)

### Directory Structure

```
plant-trmnl/
├── .agents/
│   └── goals/
│       ├── build-app.md          # ATLAS workflow
│       ├── manage-project.md     # GROOM workflow
│       └── qa.md                 # FINE workflow
├── packages/
│   ├── api/                      # plant-api container
│   │   ├── client/               # React (Vite) web app
│   │   │   ├── src/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── Dashboard.tsx
│   │   │   │   │   ├── PlantDetail.tsx
│   │   │   │   │   ├── AddPlant.tsx
│   │   │   │   │   ├── FactManagement.tsx
│   │   │   │   │   └── TrmnlPreview.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── CalibrationModal.tsx
│   │   │   │   │   ├── PlantCard.tsx
│   │   │   │   │   ├── ConditionForm.tsx
│   │   │   │   │   └── VacationToggle.tsx
│   │   │   │   ├── App.tsx
│   │   │   │   └── main.tsx
│   │   │   ├── index.html
│   │   │   └── vite.config.ts
│   │   ├── src/
│   │   │   ├── config.ts         # Validated env vars
│   │   │   ├── database/
│   │   │   │   ├── schema.ts     # SQLite schema + migrations
│   │   │   │   └── backup.ts     # Daily backup cron
│   │   │   ├── routes/
│   │   │   │   ├── plants.ts     # CRUD + mark-as-watered
│   │   │   │   ├── calibration.ts
│   │   │   │   ├── conditions.ts
│   │   │   │   ├── facts.ts
│   │   │   │   ├── screen.ts     # Internal endpoint for renderer
│   │   │   │   └── health.ts
│   │   │   ├── scheduling/
│   │   │   │   ├── engine.ts     # Interval calculation + calibration adjustment
│   │   │   │   ├── bin-packer.ts # Max 2 per day, location-aware grouping
│   │   │   │   └── vacation.ts   # Vacation mode logic
│   │   │   ├── enrichment/
│   │   │   │   ├── webhook.ts    # Fires n8n webhook
│   │   │   │   ├── callback.ts   # Receives enrichment result
│   │   │   │   └── retry.ts      # Retry queue (15 min interval)
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   └── renderer/                 # plant-renderer container
│       ├── src/
│       │   ├── config.ts
│       │   ├── render/
│       │   │   ├── watering-day.ts   # 1-card and 2-card layouts
│       │   │   └── rest-day.ts       # Fact + next watering + overdue
│       │   ├── cron.ts           # Daily 05:00 render
│       │   ├── cache.ts          # In-memory cache of today's screen
│       │   ├── push.ts            # Pushes rendered markup to TRMNL webhook API
│       │   ├── routes/
│       │   │   ├── preview.ts    # Local preview endpoint (for web app TRMNL Preview page)
│       │   │   └── health.ts
│       │   └── index.ts
│       ├── Dockerfile
│       └── package.json
├── assets/
│   ├── style-reference.png       # Canonical illustration style anchor
│   ├── placeholder-plant.png     # Generic botanical placeholder for unenriched plants
│   ├── ornaments/                # 8-10 decorative botanical PNGs
│   └── seed-facts.json           # 150 seed facts
├── docker-compose.yml
├── .env.example
├── CLAUDE.md
├── README.md
└── package.json                  # Root workspace config
```

### Environment Variables (.env)

```
# API
PORT_API=3900
DATABASE_PATH=/data/plant-trmnl.db
BACKUP_DIR=/backups
TZ=Europe/Amsterdam
CALIBRATION_DEADLINE_HOUR=12

# Renderer
PORT_RENDERER=3901
API_INTERNAL_URL=http://plant-api:3900
RENDER_CRON=0 5 * * *

# TRMNL
TRMNL_API_KEY=<your-trmnl-api-key>
TRMNL_PLUGIN_UUID=<your-private-plugin-uuid>

# n8n
N8N_ENRICHMENT_WEBHOOK_URL=<n8n-webhook-url>
N8N_ENRICHMENT_MAX_RETRIES=10

# Heating season (configurable for hemisphere)
HEATING_SEASON_START=10-01
HEATING_SEASON_END=04-01
```

## Screen Design References

All TRMNL screen designs use the Lovable mockups as canonical reference. Originals are in Downloads; copy to `docs/mockups/` during project setup for portability.

| Screen | Source File | Repo Copy |
|--------|------------|-----------|
| Watering day (1 plant) | `/Users/admin/Downloads/trmnl-1-plant-BjV-4oWY.png` | `docs/mockups/watering-1-plant.png` |
| Watering day (2 plants) | `/Users/admin/Downloads/trmnl-2-plants-Bn2iYAZV.png` | `docs/mockups/watering-2-plants.png` |
| Rest day (normal) | `/Users/admin/Downloads/trmnl-rest-day-DTZXFqYo.png` | `docs/mockups/rest-day.png` |
| Rest day (overdue) | `/Users/admin/Downloads/trmnl-rest-day-overdue-CQA6HVEc.png` | `docs/mockups/rest-day-overdue.png` |

Style: dark header bar, cream background (e-ink paper), botanical crosshatch line art (Ghibli-inspired), large serif typography for plant names, sans-serif for data fields, high contrast throughout.

## TRMNL Device Setup

The renderer pushes screen content to TRMNL's webhook API — no inbound network exposure required.

### One-time setup:

1. Log in to [usetrmnl.com](https://usetrmnl.com) → go to your device dashboard
2. Create a **Private Plugin** (requires Developer Edition)
3. Set **Strategy** to "Webhook"
4. Copy the **Plugin UUID** from the plugin settings → set as `TRMNL_PLUGIN_UUID` in `.env`
5. Go to **API Keys** → copy your API key → set as `TRMNL_API_KEY` in `.env`
6. Add the plugin to your device's **Playlist**
7. Set device refresh interval to 30 minutes (how often the screen checks for new content)

### How it works:

After the daily 05:00 render, the renderer POSTs the HTML markup to:
```
POST https://usetrmnl.com/api/custom_plugins/<TRMNL_PLUGIN_UUID>/push
Headers: Authorization: Bearer <TRMNL_API_KEY>
Body: { "merge_variables": { "markup": "<rendered HTML>" } }
```

The web app includes a **TRMNL Setup** page (`/setup`) that shows the current plugin UUID, connection status (last successful push timestamp), and a "Push now" button for testing.

## Open Questions

None — all decisions made during brainstorming.
