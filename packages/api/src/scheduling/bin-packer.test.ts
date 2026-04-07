import { describe, it, expect } from 'vitest';
import { findBestDate } from './bin-packer.js';

interface ScheduledPlant {
  id: number;
  location: string;
  nextWaterDate: string; // YYYY-MM-DD
}

describe('findBestDate', () => {
  it('returns ideal date when slot is available', () => {
    const result = findBestDate('2026-04-10', 'living room', []);
    expect(result).toBe('2026-04-10');
  });

  it('returns ideal date when only 1 plant is already scheduled', () => {
    const existing: ScheduledPlant[] = [
      { id: 1, location: 'bedroom', nextWaterDate: '2026-04-10' },
    ];
    const result = findBestDate('2026-04-10', 'living room', existing);
    expect(result).toBe('2026-04-10');
  });

  it('shifts when 2 plants already on ideal date', () => {
    const existing: ScheduledPlant[] = [
      { id: 1, location: 'bedroom', nextWaterDate: '2026-04-10' },
      { id: 2, location: 'office', nextWaterDate: '2026-04-10' },
    ];
    const result = findBestDate('2026-04-10', 'living room', existing);
    expect(result).not.toBe('2026-04-10');
  });

  it('prefers adjacent day with same-location plant', () => {
    const existing: ScheduledPlant[] = [
      { id: 1, location: 'bedroom', nextWaterDate: '2026-04-10' },
      { id: 2, location: 'living room', nextWaterDate: '2026-04-10' },
      { id: 3, location: 'living room', nextWaterDate: '2026-04-11' },
    ];
    // Apr 10 full, Apr 11 has same-location plant
    const result = findBestDate('2026-04-10', 'living room', existing);
    expect(result).toBe('2026-04-11');
  });

  it('prefers closer days over farther ones', () => {
    const existing: ScheduledPlant[] = [
      { id: 1, location: 'a', nextWaterDate: '2026-04-10' },
      { id: 2, location: 'b', nextWaterDate: '2026-04-10' },
    ];
    const result = findBestDate('2026-04-10', 'living room', existing);
    // Should be Apr 9 or Apr 11 (distance 1), not Apr 12 (distance 2)
    const diff = Math.abs(new Date(result).getTime() - new Date('2026-04-10').getTime());
    expect(diff).toBeLessThanOrEqual(86400000); // 1 day in ms
  });

  it('falls back to ideal date if all +-3 days are full', () => {
    const existing: ScheduledPlant[] = [];
    for (let d = 7; d <= 13; d++) {
      const date = `2026-04-${String(d).padStart(2, '0')}`;
      existing.push({ id: d * 10, location: 'a', nextWaterDate: date });
      existing.push({ id: d * 10 + 1, location: 'b', nextWaterDate: date });
    }
    const result = findBestDate('2026-04-10', 'living room', existing);
    expect(result).toBe('2026-04-10'); // overflow accepted
  });
});
