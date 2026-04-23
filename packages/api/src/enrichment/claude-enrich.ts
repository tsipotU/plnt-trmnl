import { query } from '@anthropic-ai/claude-agent-sdk';
import type Database from 'better-sqlite3';
import pino from 'pino';
import { calculateNextWaterDate } from '../scheduling/engine.js';
import { logEvent, logScheduleEvents } from '../database/event-log.js';
import { scheduleNextWater, type ScheduledPlant } from '../scheduling/bin-packer.js';

const logger = pino({ name: 'enrichment.claude' });

interface PlantContext {
  name: string;
  potSizeCm?: number | null;
  plantSize?: string | null;
  location?: string | null;
  lightLevel?: string | null;
}

interface EnrichmentResult {
  species: string;
  base_interval: number;
  water_ratio: number;
  water_description: string;
  fertilizer_interval_weeks: number;
  heating_season_modifier: number;
  calibration_questions: Array<{
    question_text: string;
    question_type: string;
    scale_min_label: string;
    scale_max_label: string;
  }>;
  common_conditions: Array<{
    condition_name: string;
    symptoms: string;
    remedy: string;
    severity: string;
  }>;
  facts: string[];
  watch_for: string;
}

const ENRICHMENT_PROMPT = `You are a houseplant care expert. Given a plant name and optional context, return comprehensive care data as JSON.

IMPORTANT constraints:
- water_ratio must be between 0.02 and 0.05 (this is multiplied by pot volume in ml to get watering amount)
- base_interval is days between waterings (typically 3-14 for most houseplants)
- heating_season_modifier: how to adjust during heating season Oct-Apr (typically 0.80-0.90 for volume)
- Include 2-3 calibration questions: always start with soil moisture, then a plant-specific visual indicator
- Include 5-8 common conditions with symptoms and remedies
- Include exactly 15 interesting facts about this specific plant
- water_description should be practical (e.g., "about 1.5 cups" or "soak until water drains from bottom")
- watch_for: the single most common issue to watch for with this plant

Return ONLY valid JSON matching this exact structure (no markdown, no explanation, just the JSON object):
{
  "species": "Latin name",
  "base_interval": 7,
  "water_ratio": 0.035,
  "water_description": "about 1.5 cups",
  "fertilizer_interval_weeks": 4,
  "heating_season_modifier": 0.85,
  "calibration_questions": [
    { "question_text": "...", "question_type": "soil_moisture", "scale_min_label": "Bone dry", "scale_max_label": "Soaking wet" },
    { "question_text": "...", "question_type": "leaf_condition", "scale_min_label": "...", "scale_max_label": "..." }
  ],
  "common_conditions": [
    { "condition_name": "...", "symptoms": "...", "remedy": "...", "severity": "info|warning|critical" }
  ],
  "facts": ["fact1", "fact2", "...15 total"],
  "watch_for": "..."
}`;

async function askClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const chunks: string[] = [];
  for await (const msg of query({
    prompt: userPrompt,
    options: {
      systemPrompt,
      model: 'claude-sonnet-4-5-20250929',
      maxTurns: 1,
      tools: [],
    },
  })) {
    if (msg.type === 'assistant') {
      for (const block of msg.message.content) {
        if (block.type === 'text') {
          chunks.push(block.text);
        }
      }
    }
  }
  return chunks.join('');
}

export async function enrichPlantWithClaude(
  db: Database.Database,
  plantId: number,
  plant: PlantContext,
): Promise<void> {
  logger.info({ plantId, plantName: plant.name }, 'Starting Claude enrichment');

  const userMessage = [
    `Plant: ${plant.name}`,
    plant.potSizeCm ? `Pot size: ${plant.potSizeCm}cm` : null,
    plant.plantSize ? `Plant size: ${plant.plantSize}` : null,
    plant.location ? `Location: ${plant.location}` : null,
    plant.lightLevel ? `Light level: ${plant.lightLevel}` : null,
  ].filter(Boolean).join('\n');

  try {
    const text = await askClaude(ENRICHMENT_PROMPT, userMessage);

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const data: EnrichmentResult = JSON.parse(jsonMatch[0]);

    // Update plant with enrichment data
    const existingPlant = db.prepare('SELECT * FROM plants WHERE id = ?').get(plantId) as Record<string, unknown>;
    const lastWateredAt = existingPlant.last_watered_at as string | null;
    const idealDate = lastWateredAt
      ? calculateNextWaterDate(lastWateredAt, data.base_interval)
      : null;

    let scheduled: ReturnType<typeof scheduleNextWater> | null = null;
    let nextWaterDate: string | null = null;
    if (idealDate) {
      const existing = db.prepare(
        `SELECT id, location, next_water_date as nextWaterDate
           FROM plants
           WHERE archived = 0 AND id != ? AND next_water_date IS NOT NULL`
      ).all(plantId) as ScheduledPlant[];
      scheduled = scheduleNextWater(idealDate, (existingPlant.location as string) ?? '', existing);
      nextWaterDate = scheduled.date;
    }

    db.prepare(
      `UPDATE plants SET
         species                   = ?,
         base_interval             = ?,
         current_interval          = ?,
         water_ratio               = ?,
         water_description         = ?,
         fertilizer_interval_weeks = ?,
         heating_season_modifier   = ?,
         enrichment_status         = 'complete',
         next_water_date           = COALESCE(?, next_water_date),
         updated_at                = datetime('now')
       WHERE id = ?`
    ).run(
      data.species,
      data.base_interval,
      data.base_interval,
      data.water_ratio,
      data.water_description,
      data.fertilizer_interval_weeks,
      data.heating_season_modifier,
      nextWaterDate,
      plantId,
    );

    // Insert calibration questions
    const insertQuestion = db.prepare(
      `INSERT INTO calibration_questions
         (plant_id, question_text, question_type, scale_min_label, scale_max_label, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (let i = 0; i < data.calibration_questions.length; i++) {
      const q = data.calibration_questions[i];
      insertQuestion.run(plantId, q.question_text, q.question_type, q.scale_min_label, q.scale_max_label, i);
    }

    // Insert common conditions as inactive templates
    const insertCondition = db.prepare(
      `INSERT INTO plant_conditions
         (plant_id, condition_name, symptoms, remedy, severity, is_active, detected_via)
       VALUES (?, ?, ?, ?, ?, 0, 'calibration')`
    );
    for (const c of data.common_conditions) {
      insertCondition.run(plantId, c.condition_name, c.symptoms, c.remedy, c.severity);
    }

    // Insert facts
    const insertFact = db.prepare(
      `INSERT INTO facts (plant_id, text, source) VALUES (?, ?, 'enrichment')`
    );
    for (const text of data.facts) {
      insertFact.run(plantId, text);
    }

    logEvent(db, {
      plantId,
      eventType: 'enrichment_complete',
      newValue: `interval=${data.base_interval}, ratio=${data.water_ratio}`,
      reason: `Claude enrichment: ${data.species}`,
    });

    if (scheduled) {
      logScheduleEvents(db, plantId, scheduled);
    }

    logger.info({ plantId, species: data.species, interval: data.base_interval }, 'Claude enrichment complete');
  } catch (err) {
    logger.error({ plantId, err }, 'Claude enrichment failed');

    db.prepare(
      `UPDATE plants SET enrichment_status = 'failed', updated_at = datetime('now') WHERE id = ?`
    ).run(plantId);

    logEvent(db, {
      plantId,
      eventType: 'enrichment_failed',
      reason: `Claude enrichment failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}

export async function updateCareForCondition(
  db: Database.Database,
  plantId: number,
  conditionName: string,
): Promise<{ remedy: string; adjustedInterval?: number } | null> {
  const plant = db.prepare('SELECT * FROM plants WHERE id = ?').get(plantId) as Record<string, unknown> | undefined;
  if (!plant) return null;

  const activeConditions = db.prepare(
    'SELECT condition_name, severity FROM plant_conditions WHERE plant_id = ? AND is_active = 1'
  ).all(plantId) as Array<{ condition_name: string; severity: string }>;

  try {
    const text = await askClaude(
      'You are a houseplant care expert. Return ONLY valid JSON, no explanation.',
      `A ${plant.name} (${plant.species || 'unknown species'}) has a new condition: "${conditionName}".

Current care: watered every ${plant.current_interval} days, ${plant.water_description || 'standard watering'}.
Other active conditions: ${activeConditions.map(c => c.condition_name).join(', ') || 'none'}.
Location: ${plant.location || 'unknown'}, light: ${plant.light_level || 'unknown'}.

Return JSON only:
{
  "remedy": "Specific step-by-step remedy for this condition",
  "should_adjust_interval": true/false,
  "adjusted_interval": number or null,
  "interval_reason": "why the interval should change, if applicable"
}`
    );

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const advice = JSON.parse(jsonMatch[0]);

    // Update condition with Claude's remedy
    db.prepare(
      `UPDATE plant_conditions SET remedy = ? WHERE plant_id = ? AND condition_name = ? AND is_active = 1`
    ).run(advice.remedy, plantId, conditionName);

    // Adjust interval if recommended
    if (advice.should_adjust_interval && advice.adjusted_interval) {
      const oldInterval = plant.current_interval as number;
      const newInterval = Math.max(2, advice.adjusted_interval);

      db.prepare(
        `UPDATE plants SET current_interval = ?, is_converged = 0, updated_at = datetime('now') WHERE id = ?`
      ).run(newInterval, plantId);

      logEvent(db, {
        plantId,
        eventType: 'schedule_change',
        oldValue: String(oldInterval),
        newValue: String(newInterval),
        reason: `Adjusted for condition "${conditionName}": ${advice.interval_reason}`,
      });
    }

    return {
      remedy: advice.remedy,
      adjustedInterval: advice.adjusted_interval,
    };
  } catch (err) {
    logger.error({ plantId, conditionName, err }, 'Condition care update failed');
    return null;
  }
}
