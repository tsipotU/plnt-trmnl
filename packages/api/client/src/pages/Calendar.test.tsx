import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Calendar } from './Calendar';

beforeEach(() => {
  vi.restoreAllMocks();
});

const todayIso = new Date().toISOString().slice(0, 10);

const samplePlant = {
  id: 1,
  name: 'Mona',
  common_name: 'Swiss cheese plant',
  species: 'Monstera deliciosa',
  identifier: null,
  pot_size_cm: 24,
  plant_size: 'large',
  location: 'Living room',
  light_level: 'bright_indirect',
  illustration_path: null,
  next_water_date: todayIso,
  last_watered_at: null,
  enrichment_status: 'complete',
  archived: 0,
  is_converged: 1,
  current_interval: 7,
};

function mockFetch(opts: { plants?: unknown[]; days?: unknown[] } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (url === '/api/plants') {
        return Promise.resolve({ ok: true, json: async () => opts.plants ?? [] });
      }
      if (url.startsWith('/api/schedule/week')) {
        return Promise.resolve({ ok: true, json: async () => ({ days: opts.days ?? [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }),
  );
}

describe('Calendar — basic render', () => {
  it('renders the page title and the current month label', async () => {
    mockFetch();
    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^Calendar$/ })).toBeInTheDocument();
    });
    const monthLabel = new Date().toLocaleString('en-US', { month: 'long' });
    expect(screen.getByText(new RegExp(monthLabel, 'i'))).toBeInTheDocument();
  });

  it('shows "Nothing scheduled." when the selected day has no events', async () => {
    mockFetch();
    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/Nothing scheduled/i)).toBeInTheDocument();
    });
  });
});

describe('Calendar — day selection', () => {
  it("renders today's plants when today has scheduled waterings", async () => {
    mockFetch({
      plants: [samplePlant],
      days: [
        {
          date: todayIso,
          is_today: true,
          plant_ids: [1],
          plant_names: ['Mona'],
          count: 1,
          overdue_ids: [],
          vacation: false,
        },
      ],
    });
    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Mona')).toBeInTheDocument();
    });
    expect(screen.getByText(/1 event/i)).toBeInTheDocument();
  });

  it('updates the visible plant list when a different day is tapped', async () => {
    const user = userEvent.setup();
    const tomorrowIso = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    })();

    mockFetch({
      plants: [{ ...samplePlant, id: 1, name: 'Mona', next_water_date: todayIso }],
      days: [
        {
          date: todayIso,
          is_today: true,
          plant_ids: [1],
          plant_names: ['Mona'],
          count: 1,
          overdue_ids: [],
          vacation: false,
        },
        {
          date: tomorrowIso,
          is_today: false,
          plant_ids: [],
          plant_names: [],
          count: 0,
          overdue_ids: [],
          vacation: false,
        },
      ],
    });

    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Mona')).toBeInTheDocument();
    });

    // Tap tomorrow — find the day cell by aria-label.
    const tomorrowCell = await screen.findByRole('button', {
      name: new RegExp(`^${tomorrowIso}`),
    });
    await user.click(tomorrowCell);

    await waitFor(() => {
      expect(screen.getByText(/Nothing scheduled/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Mona')).toBeNull();
  });
});

describe('Calendar — month navigation', () => {
  it('moves to the previous month when prev is clicked', async () => {
    const user = userEvent.setup();
    mockFetch();
    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^Calendar$/ })).toBeInTheDocument();
    });

    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevLabel = prev.toLocaleString('en-US', { month: 'long' });

    await user.click(screen.getByRole('button', { name: /Previous month/i }));

    await waitFor(() => {
      expect(screen.getByText(new RegExp(prevLabel, 'i'))).toBeInTheDocument();
    });
  });
});
