import { describe, it, expect } from 'vitest';
import { renderRestDay } from './rest-day.js';
import type { OverduePlant } from './rest-day.js';
import type { NextWatering } from './watering-day.js';

const fact = { text: 'Plants absorb nutrients through their roots, not their leaves.' };
const ornamentPath = '/ornaments/leaf-cluster.png';
const nextWatering: NextWatering = {
  name: 'Monstera',
  date: '2026-04-09',
  interval: 7,
};

const overdueSingle: OverduePlant[] = [
  { id: 1, name: 'Pothos', daysOverdue: 2 },
];

const overdueMultiple: OverduePlant[] = [
  { id: 1, name: 'Pothos', daysOverdue: 2 },
  { id: 2, name: 'Ficus', daysOverdue: 1 },
  { id: 3, name: 'Snake Plant', daysOverdue: 3 },
];

describe('renderRestDay', () => {
  it('contains the fact text', () => {
    const html = renderRestDay('2026-04-07', fact, ornamentPath, nextWatering, []);

    expect(html).toContain('Plants absorb nutrients through their roots, not their leaves.');
  });

  it('contains the ornament image', () => {
    const html = renderRestDay('2026-04-07', fact, ornamentPath, nextWatering, []);

    expect(html).toContain('/ornaments/leaf-cluster.png');
  });

  it('contains next watering info in footer', () => {
    const html = renderRestDay('2026-04-07', fact, ornamentPath, nextWatering, []);

    expect(html).toContain('Monstera');
    expect(html).toContain('2026-04-09');
    expect(html).toContain('7');
  });

  it('shows overdue badge for single overdue plant with humanized time (#167)', () => {
    const html = renderRestDay('2026-04-07', fact, ornamentPath, nextWatering, overdueSingle);

    expect(html).toContain('Pothos');
    // daysOverdue: 2 → "a few days ago" via humanizeDaysFromToday
    expect(html).toContain('a few days ago');
    expect(html).toContain('Overdue');
  });

  it('shows +N more for multiple overdue plants', () => {
    const html = renderRestDay('2026-04-07', fact, ornamentPath, nextWatering, overdueMultiple);

    expect(html).toContain('Pothos');
    expect(html).toContain('+2 more');
  });

  it('shows no overdue badge when list is empty', () => {
    const html = renderRestDay('2026-04-07', fact, ornamentPath, nextWatering, []);

    expect(html).not.toContain('Overdue');
  });

  it('handles no next watering gracefully', () => {
    const html = renderRestDay('2026-04-07', fact, ornamentPath, null, []);

    expect(html).toContain('No upcoming waterings');
  });

  it('output is valid HTML structure', () => {
    const html = renderRestDay('2026-04-07', fact, ornamentPath, nextWatering, []);

    expect(html.trimStart()).toMatch(/^<div/);
    expect(html).toContain('Plant TRMNL');
    expect(html).toContain('800px');
    expect(html).toContain('480px');
  });

  it('shows formatted date in header', () => {
    const html = renderRestDay('2026-04-07', fact, ornamentPath, nextWatering, []);

    // Should contain the date in some formatted form
    expect(html).toMatch(/April|Apr|2026/);
  });
});
