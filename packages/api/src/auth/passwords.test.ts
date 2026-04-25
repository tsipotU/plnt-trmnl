import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './passwords.js';

describe('passwords', () => {
  it('hash produces a non-empty string different from input', async () => {
    const h = await hashPassword('hunter2');
    expect(h).not.toBe('hunter2');
    expect(h.length).toBeGreaterThan(20);
  });

  it('verify returns true for matching password', async () => {
    const h = await hashPassword('hunter2');
    expect(await verifyPassword('hunter2', h)).toBe(true);
  });

  it('verify returns false for non-matching password', async () => {
    const h = await hashPassword('hunter2');
    expect(await verifyPassword('wrong', h)).toBe(false);
  });

  it('two hashes of the same password are not equal (per-hash salt)', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
    expect(await verifyPassword('same', a)).toBe(true);
    expect(await verifyPassword('same', b)).toBe(true);
  });
});
