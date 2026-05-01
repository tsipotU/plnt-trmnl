import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PlantsList } from './PlantsList';

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
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }),
  );
}

const today = new Date().toISOString().slice(0, 10);

function plantFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
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
    next_water_date: null,
    last_watered_at: null,
    enrichment_status: 'complete',
    archived: 0,
    is_converged: 1,
    current_interval: 7,
    ...overrides,
  };
}

describe('PlantsList — empty registry', () => {
  it('shows the registry-empty CTA when no plants exist', async () => {
    mockPlants([]);
    render(
      <MemoryRouter>
        <PlantsList />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/Nothing in the registry yet/i)).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /Add your first plant/i }),
    ).toBeInTheDocument();
  });
});

describe('PlantsList — populated', () => {
  it('renders the page title and the active count', async () => {
    mockPlants([plantFixture(), plantFixture({ id: 2, name: 'Frank' })]);
    render(
      <MemoryRouter>
        <PlantsList />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^Plants$/ })).toBeInTheDocument();
    });
    expect(screen.getByText(/Registry · 2 active/i)).toBeInTheDocument();
  });

  it('shows all plants by default and filters by search query', async () => {
    const user = userEvent.setup();
    mockPlants([
      plantFixture({ id: 1, name: 'Mona', species: 'Monstera deliciosa' }),
      plantFixture({ id: 2, name: 'Frank', species: 'Ficus lyrata' }),
      plantFixture({ id: 3, name: 'Eddie', species: 'Sansevieria trifasciata' }),
    ]);
    render(
      <MemoryRouter>
        <PlantsList />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Mona')).toBeInTheDocument();
    });
    expect(screen.getByText('Frank')).toBeInTheDocument();
    expect(screen.getByText('Eddie')).toBeInTheDocument();

    const search = screen.getByPlaceholderText(/Search by name/i);
    await user.type(search, 'fic');

    expect(screen.getByText('Frank')).toBeInTheDocument();
    expect(screen.queryByText('Mona')).toBeNull();
    expect(screen.queryByText('Eddie')).toBeNull();
  });

  it('filters by state (Dialed in)', async () => {
    const user = userEvent.setup();
    mockPlants([
      plantFixture({ id: 1, name: 'Mona', is_converged: 1 }),
      plantFixture({ id: 2, name: 'Frank', is_converged: 0, current_interval: 8 }),
    ]);
    render(
      <MemoryRouter>
        <PlantsList />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Mona')).toBeInTheDocument();
    });
    expect(screen.getByText('Frank')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Dialed in$/i }));

    expect(screen.getByText('Mona')).toBeInTheDocument();
    expect(screen.queryByText('Frank')).toBeNull();
  });

  it('shows a "no match" empty state when filters exclude everything', async () => {
    const user = userEvent.setup();
    mockPlants([plantFixture({ id: 1, name: 'Mona', is_converged: 1 })]);
    render(
      <MemoryRouter>
        <PlantsList />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Mona')).toBeInTheDocument();
    });
    const search = screen.getByPlaceholderText(/Search by name/i);
    await user.type(search, 'nonexistent');
    expect(screen.getByText(/No plants match/i)).toBeInTheDocument();
  });

  it('excludes archived plants from the list and the active count', async () => {
    mockPlants([
      plantFixture({ id: 1, name: 'Mona', archived: 0 }),
      plantFixture({ id: 2, name: 'Penny', archived: 1 }),
    ]);
    render(
      <MemoryRouter>
        <PlantsList />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/Registry · 1 active/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Mona')).toBeInTheDocument();
    expect(screen.queryByText('Penny')).toBeNull();
  });

  it('renders today filter (Due) using next_water_date', async () => {
    const user = userEvent.setup();
    mockPlants([
      plantFixture({ id: 1, name: 'Mona', next_water_date: today, is_converged: 1 }),
      plantFixture({ id: 2, name: 'Frank', next_water_date: null, is_converged: 1 }),
    ]);
    render(
      <MemoryRouter>
        <PlantsList />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Mona')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^Due$/i }));

    expect(screen.getByText('Mona')).toBeInTheDocument();
    expect(screen.queryByText('Frank')).toBeNull();
  });
});
