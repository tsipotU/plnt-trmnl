import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHead } from '../components/molecules/PageHead/PageHead.js';
import { SectionHead } from '../components/molecules/SectionHead/SectionHead.js';
import { PlantRow } from '../components/molecules/PlantRow/PlantRow.js';
import { EmptyState } from '../components/molecules/EmptyState/EmptyState.js';
import { Banner } from '../components/atoms/Banner/Banner.js';
import { RowState } from '../components/atoms/RowState/RowState.js';
import { PlantThumb } from '../components/PlantThumb.js';
import type { Plant } from '../components/PlantCard.js';
import {
  plantState,
  plantMeta,
  plantSpeciesLine,
  isoToday,
} from '../utils/plantView.js';
import './Calendar.css';

interface ScheduleDay {
  date: string;
  is_today: boolean;
  plant_ids: number[];
  plant_names: string[];
  count: number;
  overdue_ids: number[];
}

const DOW_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const MONTH_NAME = (year: number, month: number) =>
  new Date(year, month, 1).toLocaleString('en-US', { month: 'long' });

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/* Build the visible grid for `month` (0–11) of `year`: a Mon-first 6-row
   layout with leading + trailing muted cells from neighbouring months. */
function buildMonthGrid(year: number, month: number): Array<{ day: number; iso: string; muted: boolean }> {
  const first = new Date(year, month, 1);
  // Mon-first: getDay() returns 0=Sun..6=Sat → shift to 0=Mon..6=Sun
  const startDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ day: number; iso: string; muted: boolean }> = [];

  // Leading cells from previous month
  if (startDow > 0) {
    const prevDays = new Date(year, month, 0).getDate();
    for (let i = startDow; i > 0; i--) {
      const day = prevDays - i + 1;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      cells.push({ day, iso: isoDate(prevYear, prevMonth, day), muted: true });
    }
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, iso: isoDate(year, month, day), muted: false });
  }

  // Trailing cells to fill the last row up to a multiple of 7
  let trailing = 0;
  while ((cells.length + trailing) % 7 !== 0) trailing++;
  if (trailing > 0) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    for (let day = 1; day <= trailing; day++) {
      cells.push({ day, iso: isoDate(nextYear, nextMonth, day), muted: true });
    }
  }

  return cells;
}

export function Calendar() {
  const navigate = useNavigate();
  const todayIso = isoToday();
  const todayDate = new Date(todayIso + 'T00:00');

  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth());
  const [scheduleDays, setScheduleDays] = useState<ScheduleDay[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [error, setError] = useState<string | null>(null);

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const fetchSchedule = useCallback(async () => {
    // Fetch the entire visible grid (~42 days) — covers the leading + trailing
    // muted cells too, so we can show event dots on adjacent-month days.
    const fromIso = cells[0]?.iso ?? todayIso;
    const days = cells.length || 42;
    try {
      const res = await fetch(`/api/schedule/week?from=${fromIso}&days=${days}`);
      if (!res.ok) throw new Error('Schedule fetch failed');
      const data = (await res.json()) as { days: ScheduleDay[] };
      setScheduleDays(Array.isArray(data.days) ? data.days : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [cells, todayIso]);

  const fetchPlants = useCallback(async () => {
    try {
      const res = await fetch('/api/plants');
      if (!res.ok) throw new Error('Plants fetch failed');
      const data = (await res.json()) as Plant[];
      setPlants(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void fetchSchedule();
  }, [fetchSchedule]);

  useEffect(() => {
    void fetchPlants();
  }, [fetchPlants]);

  // Index schedule days by ISO date for O(1) lookups while rendering cells.
  const scheduleByDate = useMemo(() => {
    const map: Record<string, ScheduleDay> = {};
    for (const d of scheduleDays) map[d.date] = d;
    return map;
  }, [scheduleDays]);

  // Plants for the currently-selected day.
  const selectedDay = scheduleByDate[selectedDate];
  const selectedPlants: Plant[] = selectedDay
    ? selectedDay.plant_ids
        .map((id) => plants.find((p) => p.id === id))
        .filter((p): p is Plant => Boolean(p))
    : [];

  function gotoPrevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function gotoNextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function renderRow(p: Plant) {
    const state = plantState(p, todayIso);
    return (
      <PlantRow
        key={p.id}
        pictogram={<PlantThumb plant={p} size={28} />}
        name={p.name}
        species={plantSpeciesLine(p)}
        meta={plantMeta(p)}
        state={<RowState tone={state.tone}>{state.label}</RowState>}
        onClick={() => navigate(`/plants/${p.id}`)}
      />
    );
  }

  return (
    <div className="p7l-calendar">
      <PageHead solo eyebrow="Care schedule" title="Calendar" />

      <div className="p7l-calendar__month" role="navigation" aria-label="Month">
        <button
          type="button"
          className="p7l-calendar__nav"
          onClick={gotoPrevMonth}
          aria-label="Previous month"
        >
          ← prev
        </button>
        <div className="p7l-calendar__month-label" aria-live="polite">
          {MONTH_NAME(year, month)} {year}
        </div>
        <button
          type="button"
          className="p7l-calendar__nav"
          onClick={gotoNextMonth}
          aria-label="Next month"
        >
          next →
        </button>
      </div>

      {error && (
        <Banner tone="error" title="Couldn't load schedule">
          {error}
        </Banner>
      )}

      <div className="p7l-calendar__grid" role="grid" aria-label={`${MONTH_NAME(year, month)} ${year}`}>
        {DOW_LABELS.map((d) => (
          <div key={d} className="p7l-calendar__dow" role="columnheader">
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          const sched = scheduleByDate[cell.iso];
          const isToday = cell.iso === todayIso && !cell.muted;
          const hasEvents = !!sched && sched.count > 0;
          const isOverdue =
            !!sched &&
            sched.count > 0 &&
            cell.iso < todayIso;
          const isSelected = cell.iso === selectedDate;

          const classes = [
            'p7l-calendar__day',
            cell.muted && 'p7l-calendar__day--muted',
            isToday && 'p7l-calendar__day--today',
            hasEvents && 'p7l-calendar__day--has-events',
            isOverdue && 'p7l-calendar__day--overdue',
            isSelected && 'p7l-calendar__day--selected',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={`${cell.iso}-${i}`}
              type="button"
              className={classes}
              onClick={() => {
                if (cell.muted) return;
                setSelectedDate(cell.iso);
              }}
              aria-pressed={isSelected}
              aria-label={`${cell.iso}${hasEvents ? ` · ${sched!.count} watering${sched!.count === 1 ? '' : 's'}` : ''}${isToday ? ' · today' : ''}`}
              tabIndex={cell.muted ? -1 : 0}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <SectionHead
        label={selectedDate}
        action={
          selectedDay && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.06em',
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
              }}
            >
              {selectedDay.count} {selectedDay.count === 1 ? 'event' : 'events'}
            </span>
          )
        }
      />

      {selectedPlants.length === 0 ? (
        <EmptyState align="left">Nothing scheduled.</EmptyState>
      ) : (
        selectedPlants.map(renderRow)
      )}

      <div style={{ height: 96 }} />
    </div>
  );
}
