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
