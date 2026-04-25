import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MemorialPlant } from './MemorialPlant';

const memorialResponse = {
  plant: {
    id: 7,
    name: 'Old Pothos',
    species: 'Pothos',
    archived: 1,
    archived_at: '2026-04-01 00:00:00',
    archive_reason: 'died',
    archive_note: 'root rot during winter',
    created_at: '2025-01-01 00:00:00',
    location: 'Living room',
    illustration_path: null,
  },
  stats: {
    waterings: 47,
    offspring: 2,
    calibration_cycles: 3,
    lifespan_days: 455,
    joined_at: '2025-01-01 00:00:00',
    archived_at: '2026-04-01 00:00:00',
  },
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/archive/:id" element={<MemorialPlant />} />
        <Route path="/plants/:id" element={<div>plant detail</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MemorialPlant', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the in-memoriam header and stats', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => memorialResponse,
    } as Response);

    renderAt('/archive/7');

    await waitFor(() => {
      expect(screen.getByText(/In memoriam/i)).toBeInTheDocument();
      expect(screen.getByText(/Old Pothos/)).toBeInTheDocument();
    });
    expect(screen.getByText('47')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/Lived in: Living room/i)).toBeInTheDocument();
    expect(screen.getByText(/root rot during winter/i)).toBeInTheDocument();
  });

  it('shows the cause line with reason mapped to a friendly label', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => memorialResponse,
    } as Response);
    renderAt('/archive/7');
    await waitFor(() => {
      expect(screen.getByText(/Cause:/i)).toBeInTheDocument();
      expect(screen.getByText(/It died/i)).toBeInTheDocument();
    });
  });

  it('does NOT show watering schedule or current conditions', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => memorialResponse,
    } as Response);
    renderAt('/archive/7');
    await waitFor(() => {
      expect(screen.getByText(/In memoriam/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Next water/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Current conditions/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Archive plant/i })).not.toBeInTheDocument();
  });

  it('Restore button calls the API and navigates to /plants/:id', async () => {
    let restoreCalled = false;
    global.fetch = vi.fn().mockImplementation(async (url: RequestInfo) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.endsWith('/memorial')) {
        return { ok: true, json: async () => memorialResponse } as Response;
      }
      if (u.endsWith('/restore')) {
        restoreCalled = true;
        return {
          ok: true,
          json: async () => ({
            plant: { ...memorialResponse.plant, archived: 0, archived_at: null },
          }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

    const user = userEvent.setup();
    renderAt('/archive/7');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Restore plant/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Restore plant/i }));

    await waitFor(() => {
      expect(restoreCalled).toBe(true);
      expect(screen.getByText('plant detail')).toBeInTheDocument();
    });
  });

  it('renders 404 state when API returns 404', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Plant not found' }),
    } as Response);
    renderAt('/archive/999');
    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });
});
