import { useState } from 'react';

export interface CalendarDay {
  date: string;
  is_today: boolean;
  plant_ids: number[];
  plant_names: string[];
  count: number;
  overdue_ids: number[];
  vacation: boolean;
}

interface Props {
  days: CalendarDay[];
  selectedDate: string | null;
  onDaySelect: (date: string | null) => void;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarStrip({ days, selectedDate, onDaySelect }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const expandedDay = expanded ? days.find((d) => d.date === expanded) : null;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          padding: '0.5rem 0',
        }}
      >
        {days.map((day) => {
          const dt = new Date(day.date + 'T00:00:00Z');
          const dow = DOW[dt.getUTCDay()];
          const dayNum = dt.getUTCDate();
          const isSelected = selectedDate === day.date;
          const isEmpty = day.count === 0;
          const isTodayOnly = day.is_today;
          const isSelectedNotToday = isSelected && !day.is_today;

          return (
            <button
              key={day.date}
              onClick={() => {
                setExpanded(expanded === day.date ? null : day.date);
                onDaySelect(isSelected ? null : day.date);
              }}
              style={{
                minWidth: 56,
                minHeight: 64,
                padding: '0.25rem',
                background: isTodayOnly
                  ? 'var(--accent)'
                  : isSelectedNotToday
                  ? 'var(--accent-muted, rgba(0, 168, 107, 0.15))'
                  : 'var(--bg-card)',
                border:
                  isTodayOnly || isSelectedNotToday
                    ? '2px solid var(--accent)'
                    : '1px solid var(--border, #ddd)',
                color: isTodayOnly ? 'white' : 'inherit',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.1rem',
                position: 'relative',
                opacity: isEmpty ? 0.6 : 1,
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  color: isTodayOnly ? 'rgba(255,255,255,0.85)' : 'var(--text-muted, #888)',
                }}
              >
                {dow}
              </span>
              <span style={{ fontWeight: 600, color: isTodayOnly ? 'white' : 'inherit' }}>
                {dayNum}
              </span>
              {day.count > 0 ? (
                <span
                  style={{
                    fontSize: '0.7rem',
                    background: 'var(--accent)',
                    color: 'white',
                    borderRadius: 10,
                    padding: '0 0.35rem',
                    minWidth: 18,
                    textAlign: 'center',
                  }}
                >
                  {day.count}
                </span>
              ) : (
                <span style={{ color: 'var(--text-muted, #888)' }}>–</span>
              )}
              {day.overdue_ids.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 4,
                    color: 'var(--warn, orange)',
                    fontWeight: 700,
                  }}
                >
                  !
                </span>
              )}
              {day.vacation && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 4,
                    fontSize: '0.7rem',
                  }}
                >
                  🌴
                </span>
              )}
            </button>
          );
        })}
      </div>
      {expandedDay && expandedDay.count > 0 && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            background: 'var(--bg-card)',
            borderRadius: 8,
            marginTop: '0.25rem',
          }}
        >
          {expandedDay.overdue_ids.length > 0 && (
            <div>
              <strong>Overdue ({expandedDay.overdue_ids.length})</strong>
            </div>
          )}
          <div>{expandedDay.plant_names.join(', ')}</div>
        </div>
      )}
    </div>
  );
}
