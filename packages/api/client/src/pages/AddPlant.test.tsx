import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AddPlant } from './AddPlant';

function renderAddPlant() {
  return render(
    <MemoryRouter>
      <AddPlant />
    </MemoryRouter>,
  );
}

// Probe component that exposes the current route location so splash
// navigations can be asserted by the #72 tests.
function LocationProbe() {
  const loc = useLocation();
  return (
    <div data-testid="route-probe" data-pathname={loc.pathname}>
      {JSON.stringify(loc.state ?? null)}
    </div>
  );
}

function renderAddPlantWithRoutes() {
  return render(
    <MemoryRouter initialEntries={['/add']}>
      <Routes>
        <Route path="/add" element={<AddPlant />} />
        <Route path="/plants/:id" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

// Fill in the required non-watering fields so only the last-watered branch
// affects the submit gate.
async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Plant species or type/i), 'Monstera');
  await user.selectOptions(screen.getByLabelText(/Pot size/i), 'Medium');
  await user.type(screen.getByLabelText(/Location/i), 'Living room');
  await user.selectOptions(
    screen.getByRole('combobox', { name: /Light level/i }),
    'bright_indirect',
  );
}

describe('AddPlant — soil-feel fallback (issue #70)', () => {
  beforeEach(() => {
    // Default fetch: existing plants list empty, POST succeeds.
    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/system/ai-connection') {
        return { ok: true, json: async () => ({ connected: true }) } as Response;
      }
      if (init?.method === 'POST') {
        const body = init.body ? JSON.parse(init.body as string) : {};
        return {
          ok: true,
          json: async () => ({ id: 1, ...body }),
        } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }) as unknown as typeof fetch;
  });

  it('does not show soil-feel dropdown until "Don\'t know" is selected', async () => {
    renderAddPlant();
    await waitFor(() =>
      expect(screen.getByLabelText(/Plant species or type/i)).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText(/How does the soil feel/i)).toBeNull();
  });

  it('reveals soil-feel dropdown with 5 options when "Don\'t know" is selected', async () => {
    const user = userEvent.setup();
    renderAddPlant();

    await user.click(screen.getByRole('button', { name: /Don.?t know/i }));

    const dropdown = await screen.findByLabelText(/How does the soil feel/i);
    expect(dropdown).toBeInTheDocument();

    // 5 moisture options + placeholder.
    const options = dropdown.querySelectorAll('option');
    const values = Array.from(options).map((o) => o.getAttribute('value'));
    expect(values).toEqual([
      '',
      'bone_dry',
      'dry',
      'slightly_moist',
      'moist',
      'wet',
    ]);
  });

  it('disables submit when "Don\'t know" is chosen without a soil-feel', async () => {
    const user = userEvent.setup();
    renderAddPlant();

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /Don.?t know/i }));

    const submit = screen.getByRole('button', { name: /Add Plant/i });
    expect(submit).toBeDisabled();
  });

  it('enables submit once a soil-feel is chosen, and posts soil_feel in payload', async () => {
    const user = userEvent.setup();
    renderAddPlant();

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: /Don.?t know/i }));
    await user.selectOptions(
      await screen.findByLabelText(/How does the soil feel/i),
      'dry',
    );

    const submit = screen.getByRole('button', { name: /Add Plant/i });
    expect(submit).not.toBeDisabled();

    await user.click(submit);

    await waitFor(() => {
      const calls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock
        .calls;
      const postCall = calls.find(
        (c: unknown[]) =>
          typeof c[1] === 'object' &&
          c[1] !== null &&
          (c[1] as RequestInit).method === 'POST',
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse((postCall![1] as RequestInit).body as string);
      expect(body.soil_feel).toBe('dry');
    });
  });

  it('shows did-you-mean splash when enrichment fails, and re-runs enrichment on accept (issue #39)', async () => {
    const user = userEvent.setup();

    let statusPollCount = 0;
    const retryCalls: Array<{ url: string; body: unknown }> = [];

    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/system/ai-connection') {
        return { ok: true, json: async () => ({ connected: true }) } as Response;
      }
      // POST /api/plants — create
      if (url === '/api/plants' && init?.method === 'POST') {
        const body = init.body ? JSON.parse(init.body as string) : {};
        return {
          ok: true,
          json: async () => ({ id: 42, ...body }),
        } as Response;
      }
      // Enrichment status poll — first call failed, second call complete
      if (typeof url === 'string' && url.startsWith('/api/plants/42/enrichment-status')) {
        statusPollCount++;
        const status = statusPollCount === 1 ? 'failed' : 'complete';
        return {
          ok: true,
          json: async () => ({ id: 42, enrichment_status: status }),
        } as Response;
      }
      // Suggest fuzzy lookup
      if (typeof url === 'string' && url.startsWith('/api/catalog/suggest')) {
        return {
          ok: true,
          json: async () => [
            {
              slug: 'monstera-deliciosa',
              latin_name: 'Monstera deliciosa',
              category: 'foliage',
              primary_common_name: 'Swiss cheese plant',
            },
          ],
        } as Response;
      }
      // Retry enrichment
      if (
        typeof url === 'string' &&
        url === '/api/plants/42/retry-enrichment' &&
        init?.method === 'POST'
      ) {
        retryCalls.push({ url, body: JSON.parse(init.body as string) });
        return { ok: true, json: async () => ({ ok: true }) } as Response;
      }
      // Initial existing-plants list
      return { ok: true, json: async () => [] } as Response;
    }) as unknown as typeof fetch;

    renderAddPlant();
    await waitFor(() =>
      expect(screen.getByLabelText(/Plant species or type/i)).toBeInTheDocument(),
    );

    await user.type(screen.getByLabelText(/Plant species or type/i), 'monstera diliciosa');
    await user.selectOptions(screen.getByLabelText(/Pot size/i), 'Medium');
    await user.type(screen.getByLabelText(/Location/i), 'Living room');
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Light level/i }),
      'bright_indirect',
    );

    await user.click(screen.getByRole('button', { name: /Add Plant/i }));

    // Did-you-mean splash appears with the top suggestion
    const suggestionHeader = await screen.findByText(
      /Can.?t find.*monstera diliciosa/i,
      {},
      { timeout: 5000 },
    );
    expect(suggestionHeader).toBeInTheDocument();
    expect(screen.getByText(/Monstera deliciosa/)).toBeInTheDocument();
    expect(screen.getByText(/Swiss cheese plant/)).toBeInTheDocument();

    // Accept → retry-enrichment fires with the Latin name
    await user.click(screen.getByRole('button', { name: /Yes, that.?s it/i }));

    await waitFor(() => {
      expect(retryCalls.length).toBe(1);
    });
    expect(retryCalls[0].body).toEqual({ name: 'Monstera deliciosa' });
  });

  it('shows only the edit-name button when suggest returns no match (issue #39)', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/system/ai-connection') {
        return { ok: true, json: async () => ({ connected: true }) } as Response;
      }
      if (url === '/api/plants' && init?.method === 'POST') {
        const body = init.body ? JSON.parse(init.body as string) : {};
        return {
          ok: true,
          json: async () => ({ id: 7, ...body }),
        } as Response;
      }
      if (typeof url === 'string' && url.startsWith('/api/plants/7/enrichment-status')) {
        return {
          ok: true,
          json: async () => ({ id: 7, enrichment_status: 'failed' }),
        } as Response;
      }
      if (typeof url === 'string' && url.startsWith('/api/catalog/suggest')) {
        return { ok: true, json: async () => [] } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }) as unknown as typeof fetch;

    renderAddPlant();
    await waitFor(() =>
      expect(screen.getByLabelText(/Plant species or type/i)).toBeInTheDocument(),
    );

    await user.type(screen.getByLabelText(/Plant species or type/i), 'xyzzy plant');
    await user.selectOptions(screen.getByLabelText(/Pot size/i), 'Medium');
    await user.type(screen.getByLabelText(/Location/i), 'Kitchen');
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Light level/i }),
      'medium',
    );

    await user.click(screen.getByRole('button', { name: /Add Plant/i }));

    await screen.findByText(/Can.?t find.*xyzzy plant/i, {}, { timeout: 5000 });
    expect(screen.queryByRole('button', { name: /Yes, that.?s it/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Edit name/i })).toBeInTheDocument();

    // Edit name → returns to the form
    await user.click(screen.getByRole('button', { name: /Edit name/i }));
    expect(screen.getByLabelText(/Plant species or type/i)).toBeInTheDocument();
  });

  it('does not include soil_feel when user picks Today', async () => {
    const user = userEvent.setup();
    renderAddPlant();

    await fillRequiredFields(user);
    // Today is default; submit directly.
    const submit = screen.getByRole('button', { name: /Add Plant/i });
    expect(submit).not.toBeDisabled();
    await user.click(submit);

    await waitFor(() => {
      const calls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock
        .calls;
      const postCall = calls.find(
        (c: unknown[]) =>
          typeof c[1] === 'object' &&
          c[1] !== null &&
          (c[1] as RequestInit).method === 'POST',
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse((postCall![1] as RequestInit).body as string);
      expect(body.soil_feel).toBeNull();
    });
  });
});

describe('AddPlant — catalog dropdown (issue #2)', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/system/ai-connection') {
        return { ok: true, json: async () => ({ connected: true }) } as Response;
      }
      if (typeof url === 'string' && url.startsWith('/api/catalog/search')) {
        return {
          ok: true,
          json: async () => [
            {
              slug: 'monstera-deliciosa',
              latin_name: 'Monstera deliciosa',
              category: 'foliage',
              primary_common_name: 'Swiss cheese plant',
            },
            {
              slug: 'monstera-adansonii',
              latin_name: 'Monstera adansonii',
              category: 'foliage',
              primary_common_name: 'Swiss cheese vine',
            },
          ],
        } as Response;
      }
      if (url === '/api/plants' && init?.method === 'POST') {
        const body = init.body ? JSON.parse(init.body as string) : {};
        return {
          ok: true,
          json: async () => ({ id: 101, ...body }),
        } as Response;
      }
      if (typeof url === 'string' && url.startsWith('/api/plants/101/enrichment-status')) {
        return {
          ok: true,
          json: async () => ({ id: 101, enrichment_status: 'complete' }),
        } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }) as unknown as typeof fetch;
  });

  it('shows catalog search suggestions as the user types', async () => {
    const user = userEvent.setup();
    renderAddPlant();

    const input = await screen.findByLabelText(/Plant species or type/i);
    await user.type(input, 'mon');

    // Suggestion list renders after debounce
    await screen.findByRole('option', { name: /Monstera deliciosa/i });
    expect(
      screen.getByRole('option', { name: /Monstera adansonii/i }),
    ).toBeInTheDocument();
  });

  it('selecting a catalog entry fills the name and submits catalog_slug', async () => {
    const user = userEvent.setup();
    renderAddPlant();

    const input = await screen.findByLabelText(/Plant species or type/i);
    await user.type(input, 'mon');

    const option = await screen.findByRole('option', { name: /Monstera deliciosa/i });
    await user.click(option);

    // Name field now shows latin_name
    expect(
      (screen.getByLabelText(/Plant species or type/i) as HTMLInputElement).value,
    ).toBe('Monstera deliciosa');

    await user.selectOptions(screen.getByLabelText(/Pot size/i), 'Medium');
    await user.type(screen.getByLabelText(/Location/i), 'Living room');
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Light level/i }),
      'bright_indirect',
    );

    await user.click(screen.getByRole('button', { name: /Add Plant/i }));

    await waitFor(() => {
      const calls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
      const postCall = calls.find(
        (c: unknown[]) =>
          typeof c[1] === 'object' &&
          c[1] !== null &&
          (c[1] as RequestInit).method === 'POST' &&
          (c[0] as string) === '/api/plants',
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse((postCall![1] as RequestInit).body as string);
      expect(body.catalog_slug).toBe('monstera-deliciosa');
      expect(body.name).toBe('Monstera deliciosa');
    });
  });

  it('free-text name (no selection) submits without catalog_slug', async () => {
    const user = userEvent.setup();
    renderAddPlant();

    const input = await screen.findByLabelText(/Plant species or type/i);
    await user.type(input, 'Rare Orchid Hybrid');
    // Do NOT click a suggestion — fall through as free-text.

    await user.selectOptions(screen.getByLabelText(/Pot size/i), 'Medium');
    await user.type(screen.getByLabelText(/Location/i), 'Living room');
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Light level/i }),
      'medium',
    );

    await user.click(screen.getByRole('button', { name: /Add Plant/i }));

    await waitFor(() => {
      const calls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
      const postCall = calls.find(
        (c: unknown[]) =>
          typeof c[1] === 'object' &&
          c[1] !== null &&
          (c[1] as RequestInit).method === 'POST' &&
          (c[0] as string) === '/api/plants',
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse((postCall![1] as RequestInit).body as string);
      expect(body.catalog_slug).toBeNull();
      expect(body.name).toBe('Rare Orchid Hybrid');
    });
  });
});

describe('AddPlant — room picker (issue #2)', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/system/ai-connection') {
        return { ok: true, json: async () => ({ connected: true }) } as Response;
      }
      if (url === '/api/plants' && init?.method === 'POST') {
        const body = init.body ? JSON.parse(init.body as string) : {};
        return {
          ok: true,
          json: async () => ({ id: 1, ...body }),
        } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }) as unknown as typeof fetch;
  });

  it('renders common room suggestion chips', async () => {
    renderAddPlant();
    await screen.findByLabelText(/Plant species or type/i);
    // Suggestions expected by issue #2.
    expect(screen.getByRole('button', { name: /^Living room$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Bedroom$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Kitchen$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Bathroom$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Office$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Balcony$/i })).toBeInTheDocument();
  });

  it('clicking a room suggestion fills the location input', async () => {
    const user = userEvent.setup();
    renderAddPlant();

    await screen.findByLabelText(/Plant species or type/i);
    await user.click(screen.getByRole('button', { name: /^Kitchen$/i }));
    const input = screen.getByLabelText(/Location/i) as HTMLInputElement;
    expect(input.value).toBe('Kitchen');
  });

  it('custom free-text location is accepted', async () => {
    const user = userEvent.setup();
    renderAddPlant();

    await screen.findByLabelText(/Plant species or type/i);
    const input = screen.getByLabelText(/Location/i) as HTMLInputElement;
    await user.type(input, 'Hallway shelf');
    expect(input.value).toBe('Hallway shelf');
  });
});

// ---------------------------------------------------------------------------
// #72 — Post-add enrichment splash
// ---------------------------------------------------------------------------

async function fillFormAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  name = 'sanseveria',
) {
  await user.type(screen.getByLabelText(/Plant species or type/i), name);
  await user.selectOptions(screen.getByLabelText(/Pot size/i), 'Medium');
  await user.type(screen.getByLabelText(/Location/i), 'Living room');
  await user.selectOptions(
    screen.getByRole('combobox', { name: /Light level/i }),
    'bright_indirect',
  );
  await user.click(screen.getByRole('button', { name: /Add Plant/i }));
}

describe('AddPlant — post-add enrichment splash (issue #72)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a splash with species + care preview when enrichment completes', async () => {
    const user = userEvent.setup();

    let statusCalls = 0;
    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/system/ai-connection') {
        return { ok: true, json: async () => ({ connected: true }) } as Response;
      }
      if (url === '/api/plants' && init?.method === 'POST') {
        const body = init.body ? JSON.parse(init.body as string) : {};
        return {
          ok: true,
          json: async () => ({ id: 7, ...body }),
        } as Response;
      }
      if (typeof url === 'string' && url.startsWith('/api/plants/7/enrichment-status')) {
        statusCalls++;
        return {
          ok: true,
          json: async () => ({ id: 7, enrichment_status: 'complete' }),
        } as Response;
      }
      if (url === '/api/plants/7') {
        return {
          ok: true,
          json: async () => ({
            id: 7,
            name: 'sanseveria',
            species: 'Sansevieria trifasciata',
            illustration_path: 'sansevieria.png',
            light_level: 'bright_indirect',
            current_interval: 14,
            water_description: 'Every 14 days',
          }),
        } as Response;
      }
      if (typeof url === 'string' && url.startsWith('/api/catalog/entry')) {
        return {
          ok: true,
          json: async () => ({
            placement_tips: ['Bright, indirect light — tolerates low light'],
          }),
        } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }) as unknown as typeof fetch;

    renderAddPlantWithRoutes();
    await user.clear(screen.getByLabelText(/Plant species or type/i)).catch(() => {});
    await fillFormAndSubmit(user, 'sanseveria');

    // Splash shows the enriched species prominently.
    // Timeout is 5000ms because the component's first poll fires after a real
    // 1000ms setTimeout; the default 1000ms findByRole budget expires before
    // the dialog renders under any scheduling jitter.
    await screen.findByRole('dialog', { name: /Sansevieria trifasciata/i }, { timeout: 5000 });
    expect(screen.getByText(/We found/i)).toBeInTheDocument();
    expect(screen.getByText(/Sansevieria trifasciata/i)).toBeInTheDocument();

    // Care preview fields appear
    expect(screen.getByText(/Bright indirect/i)).toBeInTheDocument();
    expect(screen.getByText(/Every 14 days/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Bright, indirect light — tolerates low light/i),
    ).toBeInTheDocument();

    // Action buttons present
    expect(screen.getByRole('button', { name: /Looks right/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Not quite/i })).toBeInTheDocument();

    // The splash appeared — not the detail route yet
    expect(screen.queryByTestId('route-probe')).toBeNull();
    expect(statusCalls).toBeGreaterThanOrEqual(1);
  });

  it('"Looks right" navigates to the plant detail page', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/system/ai-connection') {
        return { ok: true, json: async () => ({ connected: true }) } as Response;
      }
      if (url === '/api/plants' && init?.method === 'POST') {
        return { ok: true, json: async () => ({ id: 12 }) } as Response;
      }
      if (typeof url === 'string' && url.startsWith('/api/plants/12/enrichment-status')) {
        return {
          ok: true,
          json: async () => ({ id: 12, enrichment_status: 'complete' }),
        } as Response;
      }
      if (url === '/api/plants/12') {
        return {
          ok: true,
          json: async () => ({
            id: 12,
            species: 'Monstera deliciosa',
            illustration_path: null,
            light_level: 'bright_indirect',
            current_interval: 7,
            water_description: null,
          }),
        } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }) as unknown as typeof fetch;

    renderAddPlantWithRoutes();
    await fillFormAndSubmit(user, 'Monstera');

    const ok = await screen.findByRole('button', { name: /Looks right/i }, { timeout: 5000 });
    await user.click(ok);

    await waitFor(() => {
      const probe = screen.getByTestId('route-probe');
      expect(probe.getAttribute('data-pathname')).toBe('/plants/12');
    });
  });

  it('"Not quite" opens a correction input that retries enrichment', async () => {
    const user = userEvent.setup();
    const retryBodies: unknown[] = [];

    let statusCalls = 0;

    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/system/ai-connection') {
        return { ok: true, json: async () => ({ connected: true }) } as Response;
      }
      if (url === '/api/plants' && init?.method === 'POST') {
        return { ok: true, json: async () => ({ id: 33 }) } as Response;
      }
      if (typeof url === 'string' && url.startsWith('/api/plants/33/enrichment-status')) {
        statusCalls++;
        return {
          ok: true,
          json: async () => ({ id: 33, enrichment_status: 'complete' }),
        } as Response;
      }
      if (
        typeof url === 'string' &&
        url === '/api/plants/33/retry-enrichment' &&
        init?.method === 'POST'
      ) {
        retryBodies.push(JSON.parse(init.body as string));
        return { ok: true, json: async () => ({ ok: true }) } as Response;
      }
      if (url === '/api/plants/33') {
        return {
          ok: true,
          json: async () => ({
            id: 33,
            species: 'Sansevieria trifasciata',
            illustration_path: null,
            light_level: 'low',
            current_interval: 21,
            water_description: null,
          }),
        } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }) as unknown as typeof fetch;

    renderAddPlantWithRoutes();
    await fillFormAndSubmit(user, 'sanseveria');

    const notQuite = await screen.findByRole('button', { name: /Not quite/i }, { timeout: 5000 });
    await user.click(notQuite);

    // Correction UI appears
    const input = await screen.findByLabelText(/Corrected plant name/i);
    await user.type(input, 'Aglaonema');
    await user.click(screen.getByRole('button', { name: /Retry enrichment/i }));

    await waitFor(() => expect(retryBodies.length).toBe(1));
    expect(retryBodies[0]).toEqual({ name: 'Aglaonema' });

    // Re-polling resumes — splash shows success again once callback completes
    await screen.findByRole('button', { name: /Looks right/i }, { timeout: 5000 });
    expect(statusCalls).toBeGreaterThanOrEqual(2);
  });

  it('times out after 10s and navigates to detail with "stillEnriching" hint', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const user = userEvent.setup({
      advanceTimers: (ms: number) => vi.advanceTimersByTime(ms),
    });

    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/system/ai-connection') {
        return { ok: true, json: async () => ({ connected: true }) } as Response;
      }
      if (url === '/api/plants' && init?.method === 'POST') {
        return { ok: true, json: async () => ({ id: 99 }) } as Response;
      }
      if (typeof url === 'string' && url.startsWith('/api/plants/99/enrichment-status')) {
        // Always pending — forces the splash to time out.
        return {
          ok: true,
          json: async () => ({ id: 99, enrichment_status: 'pending' }),
        } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }) as unknown as typeof fetch;

    renderAddPlantWithRoutes();
    await fillFormAndSubmit(user, 'Monstera');

    // Fast-forward past the 10s polling deadline.
    await vi.advanceTimersByTimeAsync(12_000);

    await waitFor(() => {
      const probe = screen.getByTestId('route-probe');
      expect(probe.getAttribute('data-pathname')).toBe('/plants/99');
    });

    const state = JSON.parse(
      screen.getByTestId('route-probe').textContent ?? 'null',
    );
    expect(state).toMatchObject({ stillEnriching: true });
  });

  it('delegates to the #39 did-you-mean splash when enrichment fails', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/system/ai-connection') {
        return { ok: true, json: async () => ({ connected: true }) } as Response;
      }
      if (url === '/api/plants' && init?.method === 'POST') {
        return { ok: true, json: async () => ({ id: 55 }) } as Response;
      }
      if (typeof url === 'string' && url.startsWith('/api/plants/55/enrichment-status')) {
        return {
          ok: true,
          json: async () => ({ id: 55, enrichment_status: 'failed' }),
        } as Response;
      }
      if (typeof url === 'string' && url.startsWith('/api/catalog/suggest')) {
        return {
          ok: true,
          json: async () => [
            {
              slug: 'sansevieria-trifasciata',
              latin_name: 'Sansevieria trifasciata',
              category: 'foliage',
              primary_common_name: 'Snake plant',
            },
          ],
        } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }) as unknown as typeof fetch;

    renderAddPlantWithRoutes();
    await fillFormAndSubmit(user, 'sanseveria');

    // #39 splash takes over — no "Looks right" visible.
    await screen.findByText(/Can.?t find.*sanseveria/i, {}, { timeout: 5000 });
    expect(screen.queryByRole('button', { name: /Looks right/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Yes, that.?s it/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// #208 — Mother plant picker: filter to same species
// ---------------------------------------------------------------------------

function makeMotherPickerFetch(existingPlants: Array<{ id: number; name: string; species: string | null }>) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/system/ai-connection') {
      return { ok: true, json: async () => ({ connected: true }) } as Response;
    }
    // GET /api/plants — return the provided list
    if (url === '/api/plants' && !init?.method) {
      return { ok: true, json: async () => existingPlants } as Response;
    }
    if (url === '/api/plants' && init?.method === 'POST') {
      const body = init.body ? JSON.parse(init.body as string) : {};
      return { ok: true, json: async () => ({ id: 99, ...body }) } as Response;
    }
    return { ok: true, json: async () => [] } as Response;
  }) as unknown as typeof fetch;
}

describe('mother plant picker (#208)', () => {
  it('hides when user has zero plants', async () => {
    global.fetch = makeMotherPickerFetch([]);

    const user = userEvent.setup();
    renderAddPlant();
    await screen.findByLabelText(/Plant species or type/i);

    await user.selectOptions(screen.getByLabelText(/Origin/i), 'seedling');

    expect(screen.queryByLabelText(/Mother plant/i)).not.toBeInTheDocument();
  });

  it('shows empty-state copy when no plants of same species exist', async () => {
    global.fetch = makeMotherPickerFetch([
      { id: 1, name: 'Pothos', species: 'Epipremnum aureum' },
    ]);

    const user = userEvent.setup();
    renderAddPlant();
    await screen.findByLabelText(/Plant species or type/i);

    await user.type(screen.getByLabelText(/Plant species or type/i), 'Monstera deliciosa');
    await user.selectOptions(screen.getByLabelText(/Origin/i), 'seedling');

    expect(screen.queryByLabelText(/Mother plant/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no Monstera deliciosa/i)).toBeInTheDocument();
  });

  it('lists only same-species plants as candidates', async () => {
    global.fetch = makeMotherPickerFetch([
      { id: 1, name: 'Mom', species: 'Monstera deliciosa' },
      { id: 2, name: 'Big one', species: 'Monstera deliciosa' },
      { id: 3, name: 'Pothos', species: 'Epipremnum aureum' },
    ]);

    const user = userEvent.setup();
    renderAddPlant();
    await screen.findByLabelText(/Plant species or type/i);

    await user.type(screen.getByLabelText(/Plant species or type/i), 'Monstera deliciosa');
    await user.selectOptions(screen.getByLabelText(/Origin/i), 'seedling');

    const select = screen.getByLabelText(/Mother plant/i) as HTMLSelectElement;
    const optionNames = Array.from(select.options).map((o) => o.text);
    expect(optionNames).toContain('Mom');
    expect(optionNames).toContain('Big one');
    expect(optionNames).not.toContain('Pothos');
  });

  it('hides picker and shows "select a species first" hint when species field is empty', async () => {
    global.fetch = makeMotherPickerFetch([
      { id: 1, name: 'Mom', species: 'Monstera deliciosa' },
    ]);

    const user = userEvent.setup();
    renderAddPlant();
    await screen.findByLabelText(/Plant species or type/i);

    // Select seedling without entering a species
    await user.selectOptions(screen.getByLabelText(/Origin/i), 'seedling');

    expect(screen.queryByLabelText(/Mother plant/i)).not.toBeInTheDocument();
    expect(screen.getByText(/select a species first/i)).toBeInTheDocument();
  });
});
