import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalibrationModal } from '../components/CalibrationModal.js';
import { CalibrationSequence } from '../components/CalibrationSequence.js';
import { BatchUndoToast } from '../components/BatchUndoToast.js';
import { useWeekSchedule } from '../hooks/useWeekSchedule.js';
import type { Plant } from '../components/PlantCard.js';
import { PageHead } from '../components/molecules/PageHead/PageHead.js';
import { StatRow, Stat } from '../components/molecules/StatRow/StatRow.js';
import { SectionHead } from '../components/molecules/SectionHead/SectionHead.js';
import { PlantRow } from '../components/molecules/PlantRow/PlantRow.js';
import { Banner } from '../components/atoms/Banner/Banner.js';
import { EmptyState } from '../components/molecules/EmptyState/EmptyState.js';
import { Button } from '../components/atoms/Button/Button.js';
import { Chip } from '../components/atoms/Chip/Chip.js';
import { RowState } from '../components/atoms/RowState/RowState.js';
import { Pictogram } from '../components/atoms/Pictogram/Pictogram.js';
import {
  plantState,
  plantPictogram,
  plantMeta,
  plantSpeciesLine,
  isoToday,
} from '../utils/plantView.js';
import './Dashboard.css';

/* === Helpers ============================================================ */

/* Today's date displayed apothecary-style, e.g. "2026·05·04 · Mon". */
function formatTodayEyebrow(now: Date = new Date()): string {
  const iso = now.toISOString().slice(0, 10).replaceAll('-', '·');
  const dow = now.toLocaleDateString('en-US', { weekday: 'short' });
  return `${iso} · ${dow}`;
}

/* "X thirsty, Y total." — or "Everyone is comfortable." when nothing's due. */
function buildSubtitle(dueCount: number, totalCount: number): string {
  if (totalCount === 0) return '';
  if (dueCount === 0) return 'Everyone is comfortable.';
  return `${dueCount} thirsty, ${totalCount} total.`;
}

/* Render a single 7-day forecast row. Page-local — only Today uses it. */
function ScheduleLine({
  day,
  count,
  names,
}: {
  day: string;
  count: number;
  names: string[];
}) {
  return (
    <div className="p7l-today__sched">
      <span className="p7l-today__sched-day">{day}</span>
      <span
        className={`p7l-today__sched-count ${
          count === 0 ? 'p7l-today__sched-count--zero' : ''
        }`}
      >
        {count === 0 ? '·' : count}
      </span>
      <span className="p7l-today__sched-names">
        {names.length === 0 ? '—' : names.join(', ')}
      </span>
    </div>
  );
}

/* === Page =============================================================== */

export function Dashboard() {
  const navigate = useNavigate();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calibQueue, setCalibQueue] = useState<number[] | null>(null);
  const [batchToast, setBatchToast] = useState<{ batchId: string; count: number } | null>(null);
  const [batching, setBatching] = useState(false);
  const { days: scheduleDays, refresh: refreshSchedule } = useWeekSchedule();

  const loadPlants = useCallback(() => {
    return fetch('/api/plants')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch plants');
        return r.json();
      })
      .then((data: Plant[]) => setPlants(data))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  useEffect(() => {
    loadPlants().finally(() => setLoading(false));
  }, [loadPlants]);

  const today = isoToday();
  const active = plants.filter((p) => p.archived === 0);
  const dueToday = active.filter(
    (p) =>
      p.next_water_date != null &&
      p.next_water_date <= today &&
      !p.last_watered_at?.startsWith(today),
  );
  const wateredToday = active.filter((p) => p.last_watered_at?.startsWith(today));
  const dialedInCount = active.filter((p) => p.is_converged === 1).length;
  const dueIds = new Set(dueToday.map((p) => p.id));
  const wateredIds = new Set(wateredToday.map((p) => p.id));
  const resting = active.filter((p) => !dueIds.has(p.id) && !wateredIds.has(p.id));

  // 7-day forecast — slice from today forward.
  const forecast = scheduleDays
    .filter((d) => d.date >= today)
    .slice(0, 7)
    .map((d) => ({
      key: d.date,
      day: new Date(d.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short' }),
      count: d.count,
      names: d.plant_names,
    }));

  async function handleWaterAll() {
    if (batching) return;
    setBatching(true);
    try {
      const ids = dueToday.map((p) => p.id);
      const res = await fetch('/api/plants/water-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plant_ids: ids }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { batch_id: string; watered: unknown[] };
      await loadPlants();
      await refreshSchedule();
      setBatchToast({ batchId: data.batch_id, count: data.watered.length });
      setCalibQueue(ids);
    } finally {
      setBatching(false);
    }
  }

  const plantNames = Object.fromEntries(plants.map((p) => [p.id, p.name] as const));

  function renderPlantRow(p: Plant) {
    const state = plantState(p, today);
    return (
      <PlantRow
        key={p.id}
        pictogram={<Pictogram name={plantPictogram(p)} size={28} />}
        name={p.name}
        species={plantSpeciesLine(p)}
        meta={plantMeta(p)}
        state={<RowState tone={state.tone}>{state.label}</RowState>}
        onClick={() => navigate(`/plants/${p.id}`)}
      />
    );
  }

  return (
    <div className="p7l-today">
      {/* Calibration modal — shown if plants are due for calibration today */}
      <CalibrationModal onDone={() => {}} />

      {/* Loading state */}
      {loading && <EmptyState>Loading plants…</EmptyState>}

      {/* Error state */}
      {error && !loading && (
        <Banner tone="error" title="Couldn't load plants">
          {error}
        </Banner>
      )}

      {/* Empty state — first plant */}
      {!loading && !error && plants.length === 0 && (
        <div className="p7l-today__welcome">
          <span className="p7l-today__welcome-emoji" aria-hidden="true">🪴</span>
          <h2 className="p7l-today__welcome-title">Welcome to p7l</h2>
          <p className="p7l-today__welcome-body">
            Add your first plant to get started.
          </p>
          <Button variant="primary" size="lg" onClick={() => navigate('/add')}>
            + Add Your First Plant
          </Button>
        </div>
      )}

      {/* Populated states */}
      {!loading && !error && active.length > 0 && (
        <>
          <PageHead
            eyebrow={formatTodayEyebrow()}
            title="Today"
            subtitle={buildSubtitle(dueToday.length, active.length)}
          />

          <StatRow>
            <Stat num={dueToday.length} label="Due" />
            <Stat num={dialedInCount} label="Dialed in" />
            <Stat num={wateredToday.length} label="Watered" />
          </StatRow>

          {dueToday.length > 0 && (
            <>
              <SectionHead
                label="Today's water"
                action={
                  dueToday.length >= 2 ? (
                    <Chip toggleable onClick={handleWaterAll} disabled={batching}>
                      {batching ? 'Watering…' : `Water all (${dueToday.length})`}
                    </Chip>
                  ) : undefined
                }
              />
              {dueToday.map(renderPlantRow)}
            </>
          )}

          {wateredToday.length > 0 && (
            <>
              <SectionHead label="Watered today" />
              {wateredToday.map(renderPlantRow)}
            </>
          )}

          {forecast.length > 0 && (
            <>
              <SectionHead label="Next 7 days" />
              {forecast.map((s) => (
                <ScheduleLine key={s.key} day={s.day} count={s.count} names={s.names} />
              ))}
            </>
          )}

          {resting.length > 0 && (
            <>
              <SectionHead label="Resting" />
              {resting.map(renderPlantRow)}
            </>
          )}

          {/* Spacer so the FAB doesn't overlap the last list row */}
          <div style={{ height: 96 }} />
        </>
      )}

      {/* Floating Add — preserved Link semantics so right-click-open-new-tab still works */}
      {plants.length > 0 && (
        <Link to="/add" aria-label="Add plant" className="p7l-today__fab">
          +
        </Link>
      )}

      {/* Post-batch calibration walkthrough */}
      {calibQueue && (
        <CalibrationSequence
          plantIds={calibQueue}
          plantNames={plantNames}
          onComplete={() => setCalibQueue(null)}
        />
      )}

      {/* Batch undo toast */}
      {batchToast && (
        <BatchUndoToast
          batchId={batchToast.batchId}
          plantCount={batchToast.count}
          onUndone={() => {
            setBatchToast(null);
            setCalibQueue(null);
            loadPlants();
            refreshSchedule();
          }}
          onDismiss={() => setBatchToast(null)}
        />
      )}
    </div>
  );
}
