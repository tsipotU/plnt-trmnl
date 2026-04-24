import { describe, it, expect } from 'vitest';
import { DAILY_FACT_CRON } from './cron-schedule.js';

describe('DAILY_FACT_CRON (#38)', () => {
  it('is a valid 5-field cron expression', () => {
    const fields = DAILY_FACT_CRON.split(/\s+/);
    expect(fields).toHaveLength(5);
  });

  it('fires at minute 0 of hour 6 (6 AM) every day', () => {
    const [minute, hour, dom, month, dow] = DAILY_FACT_CRON.split(/\s+/);
    expect(minute).toBe('0');
    expect(hour).toBe('6');
    expect(dom).toBe('*');
    expect(month).toBe('*');
    expect(dow).toBe('*');
  });
});
