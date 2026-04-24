import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PlantDetail } from './PlantDetail';
import { DEV_INFO_STORAGE_KEY } from '../hooks/useDevInfo';

// Mock fetch globally
global.fetch = vi.fn();

// Wrapper component to provide Router context with route params
function RenderWithRouter(plantId: string = '1', mockFetch?: (url: string) => Promise<any>) {
  if (mockFetch) {
    (global.fetch as any).mockImplementation(mockFetch);
  }
  return render(
    <MemoryRouter initialEntries={[`/plants/${plantId}`]}>
      <Routes>
        <Route path="/plants/:id" element={<PlantDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PlantDetail - Timeline Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders enrichment_complete event with "✓ Care profile added" title', async () => {
    const mockPlant = {
      id: 1,
      name: 'Test Plant',
      species: null,
      common_name: null,
      identifier: null,
      location: null,
      pot_size_cm: null,
      pot_size_category: null,
      plant_size: null,
      light_level: null,
      current_interval: 7,
      next_water_date: null,
      last_watered_at: null,
      illustration_path: null,
      archived: 0,
    };

    const mockConditions = [];
    const mockEvents = [
      {
        id: 1,
        event_type: 'enrichment_complete',
        old_value: null,
        new_value: 'interval=7, ratio=0.035',
        reason: 'Claude enrichment: Monstera deliciosa',
        created_at: '2026-04-23T10:00:00Z',
      },
    ];

    const mockFetch = async (url: string) => {
      if (url.includes('/api/plants/1') && !url.includes('/conditions') && !url.includes('/events')) {
        return { json: () => Promise.resolve(mockPlant), ok: true };
      }
      if (url.includes('/conditions')) {
        return { json: () => Promise.resolve(mockConditions), ok: true };
      }
      if (url.includes('/events')) {
        return { json: () => Promise.resolve(mockEvents), ok: true };
      }
      return { json: () => Promise.resolve(null), ok: false };
    };

    RenderWithRouter('1', mockFetch);

    // Wait for component to load and render the enrichment event
    await waitFor(() => {
      expect(screen.getByText('✓ Care profile added')).toBeInTheDocument();
    });

    // Verify the species name is shown (stripped of "Claude enrichment: " prefix)
    expect(screen.getByText('Monstera deliciosa')).toBeInTheDocument();

    // Verify the raw debug data is NOT rendered
    expect(screen.queryByText(/interval=7, ratio=0.035/)).not.toBeInTheDocument();
    expect(screen.queryByText(/interval=7/)).not.toBeInTheDocument();
  });

  it('does not render interval/ratio for enrichment_complete events', async () => {
    const mockPlant = {
      id: 1,
      name: 'Test Plant',
      species: null,
      common_name: null,
      identifier: null,
      location: null,
      pot_size_cm: null,
      pot_size_category: null,
      plant_size: null,
      light_level: null,
      current_interval: 10,
      next_water_date: null,
      last_watered_at: null,
      illustration_path: null,
      archived: 0,
    };

    const mockConditions = [];
    const mockEvents = [
      {
        id: 1,
        event_type: 'enrichment_complete',
        old_value: null,
        new_value: 'interval=10, ratio=0.025',
        reason: 'Claude enrichment: Euphorbia leuconeura',
        created_at: '2026-04-23T09:00:00Z',
      },
    ];

    const mockFetch = async (url: string) => {
      if (url.includes('/api/plants/1') && !url.includes('/conditions') && !url.includes('/events')) {
        return { json: () => Promise.resolve(mockPlant), ok: true };
      }
      if (url.includes('/conditions')) {
        return { json: () => Promise.resolve(mockConditions), ok: true };
      }
      if (url.includes('/events')) {
        return { json: () => Promise.resolve(mockEvents), ok: true };
      }
      return { json: () => Promise.resolve(null), ok: false };
    };

    RenderWithRouter('1', mockFetch);

    // Wait for the enrichment event to render
    await waitFor(() => {
      expect(screen.getByText('✓ Care profile added')).toBeInTheDocument();
    });

    // Verify the raw values are completely hidden
    expect(screen.queryByText(/ratio=0\.025/)).not.toBeInTheDocument();
    expect(screen.queryByText(/→/)).not.toBeInTheDocument();
  });
});

describe('PlantDetail - Species header (issue #74)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  function basePlant(overrides: Record<string, unknown> = {}) {
    return {
      id: 1,
      name: 'Harold',
      species: 'Monstera deliciosa',
      common_name: null,
      identifier: null,
      location: null,
      pot_size_cm: null,
      pot_size_category: null,
      plant_size: null,
      light_level: null,
      current_interval: 7,
      base_interval: 7,
      water_ratio: 0.035,
      water_description: 'about 1.5 cups',
      enrichment_status: 'complete',
      next_water_date: null,
      last_watered_at: null,
      illustration_path: null,
      archived: 0,
      updated_at: '2026-04-23T10:00:00Z',
      ...overrides,
    };
  }

  function mockFetchFor(plant: Record<string, unknown>, events: unknown[] = []) {
    return async (url: string, init?: RequestInit) => {
      if (url.endsWith(`/api/plants/${plant.id}`) && (!init || init.method === undefined || init.method === 'GET')) {
        return { json: () => Promise.resolve(plant), ok: true };
      }
      if (url.endsWith(`/api/plants/${plant.id}`) && init?.method === 'PUT') {
        const body = JSON.parse(init.body as string) as Record<string, unknown>;
        return { json: () => Promise.resolve({ ...plant, ...body }), ok: true };
      }
      if (url.includes('/conditions')) {
        return { json: () => Promise.resolve([]), ok: true };
      }
      if (url.includes('/events')) {
        return { json: () => Promise.resolve(events), ok: true };
      }
      if (url.includes('/notes')) {
        return { json: () => Promise.resolve([]), ok: true };
      }
      return { json: () => Promise.resolve(null), ok: false };
    };
  }

  it('shows the enriched species name prominently in the header', async () => {
    const plant = basePlant();
    RenderWithRouter('1', mockFetchFor(plant));

    const speciesNode = await screen.findByTestId('plant-species');
    expect(speciesNode).toHaveTextContent('Monstera deliciosa');
    // Prominent: font-size >= 16 (visual smoke check via inline style)
    const fontSize = speciesNode.style.fontSize;
    expect(parseInt(fontSize, 10)).toBeGreaterThanOrEqual(16);
  });

  it('exposes a "Not this? Rename →" inline action', async () => {
    const plant = basePlant();
    RenderWithRouter('1', mockFetchFor(plant));
    expect(await screen.findByRole('button', { name: /not this\? rename/i })).toBeInTheDocument();
  });

  it('submits a PUT with the corrected species when user renames', async () => {
    const plant = basePlant();
    const fetchSpy = vi.fn(mockFetchFor(plant));
    (global.fetch as any).mockImplementation(fetchSpy);

    render(
      <MemoryRouter initialEntries={[`/plants/1`]}>
        <Routes>
          <Route path="/plants/:id" element={<PlantDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    const renameBtn = await screen.findByRole('button', { name: /not this\? rename/i });
    const user = userEvent.setup();
    await user.click(renameBtn);

    const input = await screen.findByRole('textbox', { name: /species/i });
    await user.clear(input);
    await user.type(input, 'Monstera adansonii');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      const putCall = fetchSpy.mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === 'PUT',
      );
      expect(putCall).toBeTruthy();
      const body = JSON.parse((putCall![1] as RequestInit).body as string);
      expect(body).toEqual({ species: 'Monstera adansonii' });
    });
  });

  it('hides the developer info panel when the toggle is OFF (default)', async () => {
    const plant = basePlant();
    const events = [
      {
        id: 1,
        event_type: 'enrichment_complete',
        old_value: null,
        new_value: 'interval=7, ratio=0.035',
        reason: 'Claude enrichment: Monstera deliciosa',
        created_at: '2026-04-23T10:00:00Z',
      },
    ];
    RenderWithRouter('1', mockFetchFor(plant, events));

    await screen.findByTestId('plant-species');
    expect(screen.queryByText(/developer info/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/water ratio/i)).not.toBeInTheDocument();
  });

  it('shows the developer info panel when the toggle is ON', async () => {
    localStorage.setItem(DEV_INFO_STORAGE_KEY, 'true');
    const plant = basePlant();
    const events = [
      {
        id: 1,
        event_type: 'enrichment_complete',
        old_value: null,
        new_value: 'interval=7, ratio=0.035',
        reason: 'Claude enrichment: Monstera deliciosa',
        created_at: '2026-04-23T10:00:00Z',
      },
    ];
    RenderWithRouter('1', mockFetchFor(plant, events));

    const devBtn = await screen.findByRole('button', { name: /developer info/i });
    expect(devBtn).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(devBtn);

    expect(await screen.findByText(/water ratio/i)).toBeInTheDocument();
    expect(screen.getByText(/0\.035/)).toBeInTheDocument();
    expect(screen.getByText(/claude/i)).toBeInTheDocument();
  });

  it('keeps timeline enrichment events formatted as "✓ Care profile added" with dev-info ON', async () => {
    localStorage.setItem(DEV_INFO_STORAGE_KEY, 'true');
    const plant = basePlant();
    const events = [
      {
        id: 1,
        event_type: 'enrichment_complete',
        old_value: null,
        new_value: 'interval=7, ratio=0.035',
        reason: 'Claude enrichment: Monstera deliciosa',
        created_at: '2026-04-23T10:00:00Z',
      },
    ];
    RenderWithRouter('1', mockFetchFor(plant, events));

    expect(await screen.findByText('✓ Care profile added')).toBeInTheDocument();
    // The raw interval/ratio values must NEVER appear in the timeline entry.
    expect(screen.queryByText(/interval=7, ratio=0\.035/)).not.toBeInTheDocument();
  });
});

describe('PlantDetail - Active Conditions Help', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('displays help explanation for active conditions on first visit', async () => {
    const mockPlant = {
      id: 1,
      name: 'Test Plant',
      species: null,
      common_name: null,
      identifier: null,
      location: null,
      pot_size_cm: null,
      pot_size_category: null,
      plant_size: null,
      light_level: null,
      current_interval: 7,
      next_water_date: null,
      last_watered_at: null,
      illustration_path: null,
      archived: 0,
    };

    const mockConditions = [];
    const mockEvents = [];

    const mockFetch = async (url: string) => {
      if (url.includes('/api/plants/1') && !url.includes('/conditions') && !url.includes('/events')) {
        return { json: () => Promise.resolve(mockPlant), ok: true };
      }
      if (url.includes('/conditions')) {
        return { json: () => Promise.resolve(mockConditions), ok: true };
      }
      if (url.includes('/events')) {
        return { json: () => Promise.resolve(mockEvents), ok: true };
      }
      return { json: () => Promise.resolve(null), ok: false };
    };

    RenderWithRouter('1', mockFetch);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('No active conditions')).toBeInTheDocument();
    });

    // Help text should be visible
    expect(screen.getByText(/Conditions are problems affecting your plant/)).toBeInTheDocument();
  });

  it('dismisses help explanation when "Got it" is clicked', async () => {
    const mockPlant = {
      id: 1,
      name: 'Test Plant',
      species: null,
      common_name: null,
      identifier: null,
      location: null,
      pot_size_cm: null,
      pot_size_category: null,
      plant_size: null,
      light_level: null,
      current_interval: 7,
      next_water_date: null,
      last_watered_at: null,
      illustration_path: null,
      archived: 0,
    };

    const mockConditions = [];
    const mockEvents = [];

    const mockFetch = async (url: string) => {
      if (url.includes('/api/plants/1') && !url.includes('/conditions') && !url.includes('/events')) {
        return { json: () => Promise.resolve(mockPlant), ok: true };
      }
      if (url.includes('/conditions')) {
        return { json: () => Promise.resolve(mockConditions), ok: true };
      }
      if (url.includes('/events')) {
        return { json: () => Promise.resolve(mockEvents), ok: true };
      }
      return { json: () => Promise.resolve(null), ok: false };
    };

    RenderWithRouter('1', mockFetch);

    await waitFor(() => {
      expect(screen.getByText('No active conditions')).toBeInTheDocument();
    });

    // Help text box should be visible
    const helpBox = screen.getByText(/Conditions are problems affecting your plant/);
    expect(helpBox).toBeInTheDocument();

    const gotItButton = screen.getByText('Got it');
    await userEvent.click(gotItButton);

    // Help box should disappear after clicking "Got it"
    await waitFor(() => {
      expect(screen.queryByText(/Conditions are problems affecting your plant/)).not.toBeInTheDocument();
    });

    // localStorage flag should be set
    expect(localStorage.getItem('plant-conditions-help-dismissed')).toBe('true');
  });

  it('respects localStorage dismissal flag on subsequent visits', async () => {
    localStorage.setItem('plant-conditions-help-dismissed', 'true');

    const mockPlant = {
      id: 1,
      name: 'Test Plant',
      species: null,
      common_name: null,
      identifier: null,
      location: null,
      pot_size_cm: null,
      pot_size_category: null,
      plant_size: null,
      light_level: null,
      current_interval: 7,
      next_water_date: null,
      last_watered_at: null,
      illustration_path: null,
      archived: 0,
    };

    const mockConditions = [];
    const mockEvents = [];

    const mockFetch = async (url: string) => {
      if (url.includes('/api/plants/1') && !url.includes('/conditions') && !url.includes('/events')) {
        return { json: () => Promise.resolve(mockPlant), ok: true };
      }
      if (url.includes('/conditions')) {
        return { json: () => Promise.resolve(mockConditions), ok: true };
      }
      if (url.includes('/events')) {
        return { json: () => Promise.resolve(mockEvents), ok: true };
      }
      return { json: () => Promise.resolve(null), ok: false };
    };

    RenderWithRouter('1', mockFetch);

    await waitFor(() => {
      expect(screen.getByText('No active conditions')).toBeInTheDocument();
    });

    // Help text should NOT be visible when dismissed
    expect(screen.queryByText(/Conditions are problems affecting your plant/)).not.toBeInTheDocument();
  });
});
