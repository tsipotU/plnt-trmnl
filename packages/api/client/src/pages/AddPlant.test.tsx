import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AddPlant } from './AddPlant';

function renderAddPlant() {
  return render(
    <MemoryRouter>
      <AddPlant />
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
    screen.getByLabelText(/Light level/i),
    'bright_indirect',
  );
}

describe('AddPlant — soil-feel fallback (issue #70)', () => {
  beforeEach(() => {
    // Default fetch: existing plants list empty, POST succeeds.
    global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
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
