import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Dashboard } from './Dashboard';

describe('Dashboard — vacation control hidden (#81)', () => {
  it('does not import VacationToggle', () => {
    // This test verifies that the Dashboard.tsx file does not import VacationToggle
    const source = require('fs').readFileSync(
      require('path').join(__dirname, './Dashboard.tsx'),
      'utf-8',
    );
    expect(source).not.toMatch(/import.*VacationToggle/);
  });
});
