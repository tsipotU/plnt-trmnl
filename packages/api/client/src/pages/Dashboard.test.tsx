import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';

// Stub the schedule hook + minimal fetch surface that Dashboard needs.
vi.mock('../hooks/useWeekSchedule', () => ({
  useWeekSchedule: () => ({ days: [], refresh: vi.fn() }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockPlants(plants: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (url === '/api/plants') {
        return Promise.resolve({ ok: true, json: async () => plants });
      }
      // Calibration modal probes /api/calibration/due — return empty.
      if (url.startsWith('/api/calibration/due')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }),
  );
}

describe('Dashboard — empty state CTA visibility (#125)', () => {
  it('shows only the welcome CTA when no plants exist (no floating Add button)', async () => {
    mockPlants([]);
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/Welcome to PLNT/i)).toBeInTheDocument();
    });
    // The empty-state CTA renders as a button in this code path
    expect(
      screen.getByRole('button', { name: /Add Your First Plant/i }),
    ).toBeInTheDocument();
    // No floating "+ Add Plant" link — the redundant CTA is hidden in empty state
    expect(screen.queryByRole('link', { name: /^\s*\+\s*Add Plant\s*$/i })).toBeNull();
  });

  it('shows the floating Add button once at least one plant exists', async () => {
    mockPlants([
      {
        id: 1,
        name: 'Pothos',
        common_name: null,
        species: null,
        identifier: null,
        pot_size_cm: null,
        plant_size: null,
        location: null,
        light_level: null,
        illustration_path: null,
        next_water_date: null,
        last_watered_at: null,
        enrichment_status: 'complete',
        archived: 0,
      },
    ]);
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^\s*\+\s*Add Plant\s*$/i })).toBeInTheDocument();
    });
  });
});
