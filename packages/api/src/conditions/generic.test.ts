import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GENERIC_CONDITIONS } from './generic.js';

describe('#75 — GENERIC_CONDITIONS', () => {
  it('exposes between 8 and 10 entries (curated short list)', () => {
    expect(GENERIC_CONDITIONS.length).toBeGreaterThanOrEqual(8);
    expect(GENERIC_CONDITIONS.length).toBeLessThanOrEqual(10);
  });

  it('every entry has the fields required by the POST /conditions contract', () => {
    for (const c of GENERIC_CONDITIONS) {
      expect(c.name).toBeTruthy();
      expect(c.symptoms).toBeTruthy();
      expect(c.remedy).toBeTruthy();
      expect(c.prevention).toBeTruthy();
      expect(['info', 'warning', 'critical']).toContain(c.severity);
    }
  });

  it('includes the canonical examples called out in the spec', () => {
    const names = GENERIC_CONDITIONS.map((c) => c.name);
    expect(names).toContain('Root rot');
    expect(names).toContain('Overwatering');
    expect(names).toContain('Underwatering');
    expect(names).toContain('Pest infestation');
  });

  it('has unique condition names', () => {
    const names = GENERIC_CONDITIONS.map((c) => c.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('client mirror file contains every canonical name (drift guard)', () => {
    const clientPath = resolve(
      __dirname,
      '../../client/src/data/genericConditions.ts',
    );
    const clientSrc = readFileSync(clientPath, 'utf8');
    for (const c of GENERIC_CONDITIONS) {
      expect(clientSrc).toContain(`name: '${c.name}'`);
    }
  });
});
