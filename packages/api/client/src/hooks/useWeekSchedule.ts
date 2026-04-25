import { useCallback, useEffect, useState } from 'react';
import type { CalendarDay } from '../components/CalendarStrip';

const STRIP_DAYS = 11;
const STRIP_OFFSET_BACK = 5;

function isoDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function useWeekSchedule() {
  const [days, setDays] = useState<CalendarDay[]>([]);

  const refresh = useCallback(async () => {
    const from = isoDateOffset(-STRIP_OFFSET_BACK);
    const res = await fetch(`/api/schedule/week?from=${from}&days=${STRIP_DAYS}`);
    if (res.ok) {
      const data = await res.json();
      setDays(data.days);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { days, refresh };
}
