import { describe, it, expect } from 'vitest';
import { buildMemorialMessage, formatDuration } from './memorial';

describe('formatDuration', () => {
  it('returns months under 12', () => {
    expect(formatDuration('2026-01-22', '2026-04-22')).toBe('3 months');
    expect(formatDuration('2025-05-22', '2026-04-22')).toBe('11 months');
  });

  it('returns years at 12 months exact', () => {
    expect(formatDuration('2025-04-22', '2026-04-22')).toBe('1 year');
  });

  it('returns plural years over 24 months', () => {
    expect(formatDuration('2023-04-22', '2026-04-22')).toBe('3 years');
  });

  it('handles 1 month singular', () => {
    expect(formatDuration('2026-03-22', '2026-04-22')).toBe('1 month');
  });
});

describe('buildMemorialMessage', () => {
  const base = { name: 'Monstera', createdAt: '2025-08-22', archivedAt: '2026-04-22' };

  it('died variant', () => {
    const msg = buildMemorialMessage({ ...base, reason: 'died' });
    expect(msg).toBe('Monstera was in your care for 8 months. Rest well. 🌿');
  });

  it('gave_away variant', () => {
    const msg = buildMemorialMessage({ ...base, reason: 'gave_away' });
    expect(msg).toBe('Monstera found a new home after 8 months. 🌱');
  });

  it('moved variant', () => {
    const msg = buildMemorialMessage({ ...base, reason: 'moved' });
    expect(msg).toBe('Monstera is on its way to a new spot. 8 months of memories. 🌿');
  });

  it('other variant (no emoji)', () => {
    const msg = buildMemorialMessage({ ...base, reason: 'other' });
    expect(msg).toBe('Monstera was with you for 8 months.');
  });
});
