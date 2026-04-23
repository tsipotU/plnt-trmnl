import { useCallback, useEffect, useState } from 'react';
import type { CalendarDay } from '../components/CalendarStrip';

export function useWeekSchedule() {
  const [days, setDays] = useState<CalendarDay[]>([]);

  const refresh = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`/api/schedule/week?from=${today}`);
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
