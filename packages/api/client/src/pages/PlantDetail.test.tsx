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

// ---------------------------------------------------------------------------
// #3 — Rich care profile sections (Light, Placement, Conditions)
// ---------------------------------------------------------------------------

const CATALOG_FIXTURE = {
  slug: 'monstera-deliciosa',
  latin_name: 'Monstera deliciosa',
  light_profile: {
    ideal: 'bright_indirect',
    tolerance_min: 'medium',
    tolerance_max: 'bright_indirect',
    direct_sun_hours: 'Max 2 hours morning sun',
    too_little_symptoms: 'Leggy growth, small leaves',
    too_much_symptoms: 'Scorched brown patches',
  },
  placement_tips: [
    '1–2m from an east window',
    'Avoid cold drafts',
    'Give it a moss pole',
  ],
  conditions: [
    ...Array.from({ length: 5 }, (_, i) => ({
      name: `Top condition ${i + 1}`,
      symptoms: `symp ${i + 1}`,
      remedy: `rem ${i + 1}`,
      severity: 'warning' as const,
      prevention: `prev ${i + 1}`,
      is_common: true,
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      name: `Filler ${i + 1}`,
      symptoms: `fsymp ${i + 1}`,
      remedy: `frem ${i + 1}`,
      severity: 'info' as const,
      prevention: `fprev ${i + 1}`,
      is_common: false,
    })),
  ],
};

function plantFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'My Monstera',
    species: 'Monstera deliciosa',
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
    ...overrides,
  };
}

function buildFetch(opts: {
  plant: ReturnType<typeof plantFixture>;
  conditions?: unknown[];
  catalog?: unknown;
  postConditionSpy?: (body: unknown) => void;
}) {
  const conds = opts.conditions ?? [];
  return async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST' && /\/api\/plants\/\d+\/conditions$/.test(url)) {
      const body = init.body ? JSON.parse(init.body as string) : {};
      opts.postConditionSpy?.(body);
      return {
        ok: true,
        json: () =>
          Promise.resolve({
            id: 999,
            plant_id: 1,
            condition_name: body.conditionName,
            symptoms: body.symptoms ?? null,
            remedy: body.remedy ?? null,
            severity: body.severity ?? 'info',
            is_active: 1,
          }),
      };
    }
    if (url.includes('/api/catalog/entry')) {
      if (!opts.catalog) return { ok: false, json: () => Promise.resolve(null) };
      return { ok: true, json: () => Promise.resolve(opts.catalog) };
    }
    if (url.includes('/api/plants/1/conditions')) {
      return { ok: true, json: () => Promise.resolve(conds) };
    }
    if (url.includes('/api/plants/1/events')) {
      return { ok: true, json: () => Promise.resolve([]) };
    }
    if (url.includes('/api/plants/1')) {
      return { ok: true, json: () => Promise.resolve(opts.plant) };
    }
    return { ok: false, json: () => Promise.resolve(null) };
  };
}

describe('PlantDetail #3 — Light section', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders ideal, tolerance, direct-sun, and symptom copy from the catalog', async () => {
    const fetchImpl = buildFetch({
      plant: plantFixture(),
      catalog: CATALOG_FIXTURE,
    });
    RenderWithRouter('1', fetchImpl);

    await waitFor(() => {
      expect(screen.getByTestId('catalog-light-section')).toBeInTheDocument();
    });

    const section = screen.getByTestId('catalog-light-section');
    expect(section.textContent).toContain('Bright indirect');
    expect(section.textContent).toContain('Medium light to Bright indirect');
    expect(section.textContent).toContain('Max 2 hours morning sun');
    expect(section.textContent).toContain('Leggy growth, small leaves');
    expect(section.textContent).toContain('Scorched brown patches');
  });

  it('does not render the Light section when no catalog entry is found', async () => {
    const fetchImpl = buildFetch({
      plant: plantFixture({ species: 'Unknown sp.' }),
      // catalog omitted → /api/catalog/entry returns 404-like
    });
    RenderWithRouter('1', fetchImpl);

    await waitFor(() => {
      expect(screen.getByText('No active conditions')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('catalog-light-section')).not.toBeInTheDocument();
  });
});

describe('PlantDetail #3 — Placement section', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders each placement tip from the catalog as a list item', async () => {
    const fetchImpl = buildFetch({
      plant: plantFixture(),
      catalog: CATALOG_FIXTURE,
    });
    RenderWithRouter('1', fetchImpl);

    await waitFor(() => {
      expect(screen.getByTestId('catalog-placement-section')).toBeInTheDocument();
    });

    for (const tip of CATALOG_FIXTURE.placement_tips) {
      expect(screen.getByText(tip)).toBeInTheDocument();
    }
  });
});

describe('PlantDetail #3 — Catalog conditions section', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the top 5 common conditions by default (collapsed view)', async () => {
    const fetchImpl = buildFetch({
      plant: plantFixture(),
      catalog: CATALOG_FIXTURE,
    });
    RenderWithRouter('1', fetchImpl);

    await waitFor(() => {
      expect(screen.getByTestId('catalog-conditions-section')).toBeInTheDocument();
    });

    // Top 5 visible
    expect(screen.getByText('Top condition 1')).toBeInTheDocument();
    expect(screen.getByText('Top condition 5')).toBeInTheDocument();
    // Non-common filler hidden
    expect(screen.queryByText('Filler 1')).not.toBeInTheDocument();
  });

  it('expands to show all 15 conditions when the toggle is tapped', async () => {
    const fetchImpl = buildFetch({
      plant: plantFixture(),
      catalog: CATALOG_FIXTURE,
    });
    RenderWithRouter('1', fetchImpl);

    await waitFor(() => {
      expect(screen.getByTestId('catalog-conditions-section')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText(/Show all 15 conditions/));

    expect(screen.getByText('Filler 1')).toBeInTheDocument();
    expect(screen.getByText('Filler 10')).toBeInTheDocument();
  });

  it('flags a catalog condition as active by POSTing to /api/plants/:id/conditions', async () => {
    const postBodies: unknown[] = [];
    const fetchImpl = buildFetch({
      plant: plantFixture(),
      catalog: CATALOG_FIXTURE,
      postConditionSpy: (body) => postBodies.push(body),
    });
    RenderWithRouter('1', fetchImpl);

    await waitFor(() => {
      expect(screen.getByText('Top condition 1')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText('Flag Top condition 1 as active'));

    await waitFor(() => {
      expect(postBodies).toHaveLength(1);
    });
    expect(postBodies[0]).toMatchObject({
      conditionName: 'Top condition 1',
      symptoms: 'symp 1',
      remedy: 'rem 1',
      severity: 'warning',
    });
  });
});

describe('PlantDetail #3 — Light mismatch warning', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders a warning when plant.light_level differs from catalog.light_profile.ideal', async () => {
    const fetchImpl = buildFetch({
      plant: plantFixture({ light_level: 'low', location: 'Bathroom' }),
      catalog: CATALOG_FIXTURE, // ideal = bright_indirect
    });
    RenderWithRouter('1', fetchImpl);

    await waitFor(() => {
      expect(screen.getByRole('alert', { name: /light mismatch/i })).toBeInTheDocument();
    });

    const alert = screen.getByRole('alert', { name: /light mismatch/i });
    expect(alert.textContent).toMatch(/bright indirect/i);
    expect(alert.textContent).toMatch(/low light/i);
    expect(alert.textContent).toMatch(/bathroom/i);
  });

  it('hides the warning when plant.light_level matches catalog.light_profile.ideal', async () => {
    const fetchImpl = buildFetch({
      plant: plantFixture({ light_level: 'bright_indirect' }),
      catalog: CATALOG_FIXTURE,
    });
    RenderWithRouter('1', fetchImpl);

    await waitFor(() => {
      expect(screen.getByTestId('catalog-light-section')).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert', { name: /light mismatch/i })).not.toBeInTheDocument();
  });

  it('hides the warning when light_level is unset', async () => {
    const fetchImpl = buildFetch({
      plant: plantFixture({ light_level: null }),
      catalog: CATALOG_FIXTURE,
    });
    RenderWithRouter('1', fetchImpl);

    await waitFor(() => {
      expect(screen.getByTestId('catalog-light-section')).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert', { name: /light mismatch/i })).not.toBeInTheDocument();
  });
});

describe('PlantDetail - About this plant card (#37)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const basePlant = {
    id: 1,
    name: 'My Monstera',
    species: 'Monstera deliciosa',
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

  const fullAbout = {
    common_names: {
      en: ['Swiss cheese plant', 'Monstera'],
      nl: ['Gatenplant'],
    },
    origin: 'Southern Mexico and Central America',
    toxicity: 'Toxic to pets (calcium oxalate crystals).',
    lore: 'Named for its holey leaves reminiscent of Swiss cheese.',
    etymology: "Monstera from Latin 'monstrum'; deliciosa refers to the edible fruit.",
  };

  function makeFetch(plant: any) {
    return async (url: string) => {
      if (url.includes('/api/plants/1') && !url.includes('/conditions') && !url.includes('/events')) {
        return { json: () => Promise.resolve(plant), ok: true };
      }
      if (url.includes('/conditions')) {
        return { json: () => Promise.resolve([]), ok: true };
      }
      if (url.includes('/events')) {
        return { json: () => Promise.resolve([]), ok: true };
      }
      return { json: () => Promise.resolve(null), ok: false };
    };
  }

  it('renders the card header with the plant name when about data is present', async () => {
    RenderWithRouter('1', makeFetch({ ...basePlant, about: fullAbout }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /About My Monstera/i })).toBeInTheDocument();
    });
  });

  it('is collapsed by default (content not visible)', async () => {
    RenderWithRouter('1', makeFetch({ ...basePlant, about: fullAbout }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /About My Monstera/i })).toBeInTheDocument();
    });

    // Values from the About payload should NOT be visible before expanding.
    expect(screen.queryByText(/Southern Mexico/)).not.toBeInTheDocument();
    expect(screen.queryByText('Gatenplant')).not.toBeInTheDocument();
  });

  it('expands and shows full catalog data on click', async () => {
    RenderWithRouter('1', makeFetch({ ...basePlant, about: fullAbout }));

    const header = await screen.findByRole('button', { name: /About My Monstera/i });
    await userEvent.click(header);

    expect(screen.getByText(/Swiss cheese plant/)).toBeInTheDocument();
    expect(screen.getByText(/Gatenplant/)).toBeInTheDocument();
    expect(screen.getByText(/Southern Mexico/)).toBeInTheDocument();
    expect(screen.getByText(/Toxic to pets/)).toBeInTheDocument();
    // Lore text (the common-name cell also contains "Swiss cheese" so match the whole line)
    expect(screen.getByText(/Named for its holey leaves/)).toBeInTheDocument();
    expect(screen.getByText(/Latin 'monstrum'/)).toBeInTheDocument();
  });

  it('collapses again on a second click', async () => {
    RenderWithRouter('1', makeFetch({ ...basePlant, about: fullAbout }));

    const header = await screen.findByRole('button', { name: /About My Monstera/i });
    await userEvent.click(header);
    expect(screen.getByText(/Southern Mexico/)).toBeInTheDocument();

    await userEvent.click(header);
    await waitFor(() => {
      expect(screen.queryByText(/Southern Mexico/)).not.toBeInTheDocument();
    });
  });

  it('does not render the card when about is null (no catalog match)', async () => {
    RenderWithRouter('1', makeFetch({ ...basePlant, about: null }));

    // Wait for the page to finish loading by waiting for another known element.
    await waitFor(() => {
      expect(screen.getByText('No active conditions')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /About My Monstera/i })).not.toBeInTheDocument();
  });

  it('does not render the card when about is absent from the response', async () => {
    RenderWithRouter('1', makeFetch(basePlant));

    await waitFor(() => {
      expect(screen.getByText('No active conditions')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /About/i })).not.toBeInTheDocument();
  });

  it('omits missing optional sections (no etymology / lore)', async () => {
    const partial = {
      common_names: { en: ['Rubber plant'], nl: ['Rubberboom'] },
      origin: 'Northeast India',
      toxicity: 'Toxic to pets.',
    };
    RenderWithRouter('1', makeFetch({ ...basePlant, about: partial }));

    const header = await screen.findByRole('button', { name: /About My Monstera/i });
    await userEvent.click(header);

    expect(screen.getByText(/Rubber plant/)).toBeInTheDocument();
    expect(screen.queryByText('Lore')).not.toBeInTheDocument();
    expect(screen.queryByText('Etymology')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// #75 — Active conditions add/edit/remove picker
// ---------------------------------------------------------------------------

describe('PlantDetail #75 — Add condition picker', () => {
  beforeEach(() => {
    localStorage.setItem('plant-conditions-help-dismissed', 'true');
    vi.clearAllMocks();
  });

  it('shows an "Add condition" button in the Active Conditions section', async () => {
    const fetchImpl = buildFetch({ plant: plantFixture(), catalog: CATALOG_FIXTURE });
    RenderWithRouter('1', fetchImpl);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add condition/i })).toBeInTheDocument();
    });
  });

  it('opens a picker modal with both generic and species sections on click', async () => {
    const fetchImpl = buildFetch({ plant: plantFixture(), catalog: CATALOG_FIXTURE });
    RenderWithRouter('1', fetchImpl);

    const addBtn = await screen.findByRole('button', { name: /add condition/i });
    await userEvent.click(addBtn);

    const dialog = (await screen.findByRole('dialog', { name: /add condition/i })) as HTMLElement;
    expect(dialog).toBeInTheDocument();
    // Both section headers render
    expect(dialog).toHaveTextContent(/common to any plant/i);
    expect(dialog).toHaveTextContent(/common for this species/i);
    // Generic entries from module
    expect(dialog).toHaveTextContent('Root rot');
    expect(dialog).toHaveTextContent('Overwatering');
    // Species entries from catalog fixture (top 5 common)
    expect(dialog).toHaveTextContent('Top condition 1');
  });

  it('tapping a generic row POSTs and adds the condition to the active list', async () => {
    const postBodies: unknown[] = [];
    const fetchImpl = buildFetch({
      plant: plantFixture(),
      catalog: CATALOG_FIXTURE,
      postConditionSpy: (body) => postBodies.push(body),
    });
    RenderWithRouter('1', fetchImpl);

    const addBtn = await screen.findByRole('button', { name: /add condition/i });
    await userEvent.click(addBtn);

    await userEvent.click(screen.getByRole('button', { name: /flag Root rot as active/i }));

    await waitFor(() => {
      expect(postBodies).toHaveLength(1);
    });
    expect(postBodies[0]).toMatchObject({
      conditionName: 'Root rot',
      severity: 'critical',
    });
    // Appears in the active conditions list (picker closes on pick)
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /add condition/i })).not.toBeInTheDocument();
    });
    expect(screen.getAllByText('Root rot').length).toBeGreaterThanOrEqual(1);
  });

  it('tapping a species row POSTs and adds the condition to the active list', async () => {
    const postBodies: unknown[] = [];
    const fetchImpl = buildFetch({
      plant: plantFixture(),
      catalog: CATALOG_FIXTURE,
      postConditionSpy: (body) => postBodies.push(body),
    });
    RenderWithRouter('1', fetchImpl);

    const addBtn = await screen.findByRole('button', { name: /add condition/i });
    await userEvent.click(addBtn);

    // The species rows live in the picker. The #3 catalog section also renders
    // one outside the dialog; pick the dialog scope explicitly.
    const dialog = await screen.findByRole('dialog', { name: /add condition/i });
    const speciesBtn = (dialog as HTMLElement).querySelector(
      'button[aria-label="Flag Top condition 2 as active"]',
    ) as HTMLButtonElement | null;
    expect(speciesBtn).not.toBeNull();
    await userEvent.click(speciesBtn!);

    await waitFor(() => {
      expect(postBodies).toHaveLength(1);
    });
    expect(postBodies[0]).toMatchObject({
      conditionName: 'Top condition 2',
      severity: 'warning',
    });
  });

  it('free-text fallback creates a condition with the typed name', async () => {
    const postBodies: unknown[] = [];
    const fetchImpl = buildFetch({
      plant: plantFixture(),
      catalog: CATALOG_FIXTURE,
      postConditionSpy: (body) => postBodies.push(body),
    });
    RenderWithRouter('1', fetchImpl);

    const addBtn = await screen.findByRole('button', { name: /add condition/i });
    await userEvent.click(addBtn);

    // Expand the "Other — describe" fallback
    await userEvent.click(screen.getByRole('button', { name: /other — describe/i }));

    const textarea = screen.getByPlaceholderText(/describe the condition/i);
    await userEvent.type(textarea, 'Weird brown specks');

    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => {
      expect(postBodies).toHaveLength(1);
    });
    expect(postBodies[0]).toMatchObject({ conditionName: 'Weird brown specks' });
  });

  it('hides the species section when no catalog entry is found', async () => {
    const fetchImpl = buildFetch({
      plant: plantFixture({ species: 'Unknown sp.' }),
      // no catalog
    });
    RenderWithRouter('1', fetchImpl);

    const addBtn = await screen.findByRole('button', { name: /add condition/i });
    await userEvent.click(addBtn);

    expect(screen.getByText(/common to any plant/i)).toBeInTheDocument();
    expect(screen.queryByText(/common for this species/i)).not.toBeInTheDocument();
  });

  it('removes an active condition via the resolve endpoint', async () => {
    const resolveCalls: string[] = [];
    const activeCondition = {
      id: 42,
      plant_id: 1,
      condition_name: 'Root rot',
      symptoms: 'mushy',
      remedy: 'repot',
      severity: 'critical',
      is_active: 1,
    };
    const fetchImpl = async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && url.includes('/api/conditions/42/resolve')) {
        resolveCalls.push(url);
        return { ok: true, json: () => Promise.resolve({ ...activeCondition, is_active: 0 }) };
      }
      if (url.includes('/api/catalog/entry')) {
        return { ok: true, json: () => Promise.resolve(CATALOG_FIXTURE) };
      }
      if (url.includes('/api/plants/1/conditions')) {
        return { ok: true, json: () => Promise.resolve([activeCondition]) };
      }
      if (url.includes('/api/plants/1/events')) {
        return { ok: true, json: () => Promise.resolve([]) };
      }
      if (url.includes('/api/plants/1')) {
        return { ok: true, json: () => Promise.resolve(plantFixture()) };
      }
      return { ok: false, json: () => Promise.resolve(null) };
    };
    RenderWithRouter('1', fetchImpl as (url: string) => Promise<any>);

    // Wait for the active condition row to appear
    await waitFor(() => {
      // The remove affordance (existing "Resolve" button) should be present
      const resolveBtns = screen.getAllByRole('button', { name: /resolve|remove/i });
      expect(resolveBtns.length).toBeGreaterThan(0);
    });

    const removeBtn = screen
      .getAllByRole('button', { name: /resolve|remove/i })
      .find((b) => (b as HTMLButtonElement).textContent?.match(/resolve|remove/i));
    expect(removeBtn).toBeDefined();
    await userEvent.click(removeBtn!);

    await waitFor(() => {
      expect(resolveCalls).toHaveLength(1);
    });
  });
});

// ---------------------------------------------------------------------------
// #72 — "Still enriching" badge on post-add splash timeout
// ---------------------------------------------------------------------------

describe('PlantDetail — still-enriching badge (issue #72)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  function RenderWithState(state: Record<string, unknown>, plant: ReturnType<typeof plantFixture>) {
    (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes('/conditions')) return { ok: true, json: () => Promise.resolve([]) };
      if (url.includes('/events')) return { ok: true, json: () => Promise.resolve([]) };
      if (url.includes('/api/plants/1')) return { ok: true, json: () => Promise.resolve(plant) };
      return { ok: false, json: () => Promise.resolve(null) };
    });
    return render(
      <MemoryRouter initialEntries={[{ pathname: '/plants/1', state }]}>
        <Routes>
          <Route path="/plants/:id" element={<PlantDetail />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('shows the badge when navigated with stillEnriching: true and enrichment still pending', async () => {
    RenderWithState(
      { stillEnriching: true },
      plantFixture({ enrichment_status: 'pending' }),
    );
    await screen.findByText(/Still enriching — check back shortly/i);
  });

  it('hides the badge when enrichment_status is already complete', async () => {
    RenderWithState(
      { stillEnriching: true },
      plantFixture({ enrichment_status: 'complete' }),
    );
    // Wait for the page to render, then assert the badge is NOT present.
    await screen.findByText(/My Monstera/);
    expect(screen.queryByText(/Still enriching/i)).toBeNull();
  });

  it('does not show the badge when stillEnriching flag is absent', async () => {
    RenderWithState({}, plantFixture({ enrichment_status: 'pending' }));
    await screen.findByText(/My Monstera/);
    expect(screen.queryByText(/Still enriching/i)).toBeNull();
  });
});
