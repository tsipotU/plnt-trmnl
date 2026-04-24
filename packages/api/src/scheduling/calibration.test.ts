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

describe('dry-days target convergence (simulation, #36)', () => {
  // Simulate: user waters plant and rates 3 (just right) once the dry-days
  // target matches reality. With a plant that actually wants 5 dry days, the
  // target should converge there regardless of starting point.
  function simulate(startTarget: number, actualDryDays: number, iterations: number): number {
    let target = startTarget;
    const answers: number[] = [];
    for (let i = 0; i < iterations; i++) {
      let answer: number;
      if (target < actualDryDays - 1) answer = 4; // waiting longer is ok
      else if (target < actualDryDays) answer = 4;
      else if (target === actualDryDays) answer = 3;
      else if (target === actualDryDays + 1) answer = 2;
      else answer = 1;
      answers.push(answer);
      target = adjustInterval(target, answer);
      if (checkConvergence(answers)) break;
    }
    return target;
  }

  it('converges on actual dry-days target from below', () => {
    expect(simulate(3, 5, 50)).toBe(5);
  });

  it('converges on actual dry-days target from above', () => {
    expect(simulate(10, 5, 50)).toBe(5);
  });

  it('respects the minimum of 2 dry days', () => {
    // Plant wants 1 dry day but we clamp at 2
    expect(simulate(5, 1, 50)).toBe(2);
  });
});
