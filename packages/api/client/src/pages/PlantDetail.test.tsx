import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PlantDetail } from './PlantDetail';

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
      notes: null,
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
      notes: null,
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
      notes: null,
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
      notes: null,
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
      notes: null,
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
