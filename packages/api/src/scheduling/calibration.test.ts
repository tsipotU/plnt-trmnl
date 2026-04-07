import { describe, it, expect } from 'vitest';
import { adjustInterval, checkConvergence } from './calibration.js';

describe('adjustInterval', () => {
  it('shortens by 1 for answer 1 (bone dry)', () => {
    expect(adjustInterval(7, 1)).toBe(6);
  });
  it('shortens by 1 for answer 2 (dry)', () => {
    expect(adjustInterval(7, 2)).toBe(6);
  });
  it('keeps interval for answer 3 (just right)', () => {
    expect(adjustInterval(7, 3)).toBe(7);
  });
  it('extends by 1 for answer 4 (wet)', () => {
    expect(adjustInterval(7, 4)).toBe(8);
  });
  it('extends by 2 for answer 5 (soaking)', () => {
    expect(adjustInterval(7, 5)).toBe(9);
  });
  it('enforces minimum of 2 days', () => {
    expect(adjustInterval(2, 1)).toBe(2);
  });
  it('enforces minimum even from 3', () => {
    expect(adjustInterval(3, 1)).toBe(2);
  });
});

describe('checkConvergence', () => {
  it('returns true after 3 consecutive 3s', () => {
    expect(checkConvergence([3, 3, 3])).toBe(true);
  });
  it('returns false with only 2 consecutive 3s', () => {
    expect(checkConvergence([3, 3])).toBe(false);
  });
  it('returns false if last answer was not 3', () => {
    expect(checkConvergence([3, 3, 4])).toBe(false);
  });
  it('checks only last 3 values', () => {
    expect(checkConvergence([4, 3, 3, 3])).toBe(true);
  });
  it('returns false for empty history', () => {
    expect(checkConvergence([])).toBe(false);
  });
});
