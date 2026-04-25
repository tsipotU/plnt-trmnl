# Wave 8 Manual Smoke Test

Run before merging the Wave 8 PR. Catches anything the test suite misses.

## Setup

```bash
cd ~/Projects/plant-trmnl
git checkout feat/wave-8-community-release
docker compose down && docker compose up -d --build
sleep 5
curl -sf http://localhost:3900/health
```

Expected: `{"status":"ok","service":"plant-api"}`.

## 1. POST plant — verify pending status

```bash
curl -sf -X POST http://localhost:3900/api/plants \
  -H 'Content-Type: application/json' \
  -d '{"name":"Wave 8 Test Plant"}'
```

Expected: 201 with the plant object. Note the `id`.

```bash
curl -sf 'http://localhost:3900/api/plants?enrichment=pending' \
  | jq '.[] | {id, name, enrichment_status}'
```

Expected: the test plant appears, `enrichment_status="pending"`.

## 2. POST enrichment — verify status flips and data persists

Use the plant `id` from step 1:

```bash
PLANT_ID=<id>
curl -sf -X POST "http://localhost:3900/api/plants/${PLANT_ID}/enrichment" \
  -H 'Content-Type: application/json' \
  -d '{
    "base_interval": 7,
    "water_ratio": 0.25,
    "water_description": "1 cup",
    "fertilizer_interval_weeks": 4,
    "heating_season_modifier": 1.0,
    "calibration_questions": [
      {"question_text": "How dry is the topsoil?", "question_type": "scale_1_5", "scale_min_label": "soaking", "scale_max_label": "bone dry"}
    ],
    "common_conditions": [
      {"condition_name": "Yellow leaves", "symptoms": "yellowing on lower leaves", "remedy": "check watering", "severity": "warning"}
    ],
    "facts": [
      "This is a manually-injected test fact.",
      "Plants like this one require consistent moisture."
    ]
  }'
```

Expected: 200, `{"ok":true}`.

```bash
curl -sf "http://localhost:3900/api/plants/${PLANT_ID}" \
  | jq '{enrichment_status, base_interval, water_description}'
```

Expected: `enrichment_status="complete"`, `base_interval=7`, `water_description="1 cup"`.

## 3. Settings page — Copy AI setup prompt

1. Open `http://localhost:3900/settings` in a browser.
2. Verify "Connect your AI" section is visible at the top.
3. Click **Copy AI setup prompt**.
4. Paste into a scratch document.
5. Verify the prompt:
   - Contains `http://localhost:3900/api/plants?enrichment=pending` (your actual base URL)
   - Contains numbered sample facts (from the existing facts table; up to 10)
   - Contains both POST endpoints
   - Has no leftover `{{BASE_URL}}` or `{{SAMPLE_FACTS}}` placeholders

## 4. Flag a condition — verify pending care update

```bash
curl -sf -X POST "http://localhost:3900/api/plants/${PLANT_ID}/conditions" \
  -H 'Content-Type: application/json' \
  -d '{"conditionName": "test condition", "symptoms": "test", "remedy": "test", "severity": "info"}'
```

Expected: 201.

```bash
curl -sf 'http://localhost:3900/api/conditions?care_update=pending' \
  | jq '.[] | {id, condition_name, care_update_status}'
```

Expected: the new condition appears with `care_update_status="pending"`.

## 5. POST care update — verify interval changes

```bash
COND_ID=<id from step 4>
curl -sf -X POST "http://localhost:3900/api/conditions/${COND_ID}/care-update" \
  -H 'Content-Type: application/json' \
  -d '{"interval_delta_days": -2, "rationale": "Manual smoke test of the care-update endpoint."}'
```

Expected: 200, `{"ok":true, "new_interval": 5}`.

```bash
curl -sf "http://localhost:3900/api/plants/${PLANT_ID}" | jq '.current_interval'
```

Expected: `5` (was 7, delta -2).

## 6. Final cleanup

```bash
curl -sf -X DELETE "http://localhost:3900/api/plants/${PLANT_ID}"
```

(Or archive via the UI.)

## 7. Sign-off

If all 6 sections passed: PR is mergeable.
If any failed: do not merge. Open issues for the failures, fix, re-run.
