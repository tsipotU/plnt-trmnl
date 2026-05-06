/**
 * PlantDetail → note save flow — full user journey through both entry points
 * (top QuickAction and the in-place empty-state button added in #176). End to
 * end: click → NoteSheet opens → type → POST → toast.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PlantDetail } from './PlantDetail';

global.fetch = vi.fn();

function plantFixture() {
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
  };
}

function RenderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/plants/1']}>
      <Routes>
        <Route path="/plants/:id" element={<PlantDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PlantDetail — note save flow (full user journey)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('saves a note when user types and clicks Save', async () => {
    const postNoteSpy = vi.fn();

    (global.fetch as any).mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && /\/api\/plants\/1\/notes$/.test(url)) {
        const parsed = JSON.parse(init.body as string);
        postNoteSpy(parsed);
        return {
          ok: true,
          status: 201,
          json: async () => ({
            id: 1,
            plant_id: 1,
            body: parsed.body,
            created_at: '2026-05-06T10:00:00Z',
            updated_at: null,
          }),
        };
      }
      if (/\/api\/plants\/1\/notes$/.test(url)) {
        return { ok: true, json: async () => [] };
      }
      if (url.includes('/api/catalog/entry')) {
        return { ok: false, json: async () => null };
      }
      if (url.includes('/api/plants/1/conditions')) {
        return { ok: true, json: async () => [] };
      }
      if (url.includes('/api/plants/1/events')) {
        return { ok: true, json: async () => [] };
      }
      if (url.includes('/api/plants/1')) {
        return { ok: true, json: async () => plantFixture() };
      }
      return { ok: false, json: async () => null };
    });

    RenderWithRouter();

    // Wait for plant to load
    await waitFor(() => {
      expect(screen.getByText('My Monstera')).toBeInTheDocument();
    });

    // Click the Note QuickAction. The QuickAction's accessible name is the
    // pencil icon + label ("✎Note"); the empty-state button is "+ Add note"
    // — selector targets the icon-prefixed form to disambiguate.
    const noteAction = screen.getByRole('button', { name: /✎.*note/i });
    await userEvent.click(noteAction);

    // NoteSheet opens
    const textarea = await screen.findByPlaceholderText('What did you notice?');
    await userEvent.type(textarea, 'Leaves looking droopy');

    // Click Save
    const saveBtn = screen.getByRole('button', { name: /save note/i });
    await userEvent.click(saveBtn);

    // Verify POST happened with correct body
    await waitFor(() => {
      expect(postNoteSpy).toHaveBeenCalledWith({ body: 'Leaves looking droopy' });
    });

    // Verify success toast appears
    await waitFor(() => {
      expect(screen.getByText(/note saved/i)).toBeInTheDocument();
    });
  });

  it('opens the NoteSheet from the in-place "+ Add note" empty-state button (#176)', async () => {
    (global.fetch as any).mockImplementation(async (url: string) => {
      if (/\/api\/plants\/1\/notes$/.test(url)) {
        return { ok: true, json: async () => [] };
      }
      if (url.includes('/api/catalog/entry')) {
        return { ok: false, json: async () => null };
      }
      if (url.includes('/api/plants/1/conditions')) {
        return { ok: true, json: async () => [] };
      }
      if (url.includes('/api/plants/1/events')) {
        return { ok: true, json: async () => [] };
      }
      if (url.includes('/api/plants/1')) {
        return { ok: true, json: async () => plantFixture() };
      }
      return { ok: false, json: async () => null };
    });

    RenderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('My Monstera')).toBeInTheDocument();
    });

    // Empty state's "+ Add note" button is rendered (because zero notes).
    const addBtn = await screen.findByRole('button', { name: /\+\s*add note/i });
    await userEvent.click(addBtn);

    // Same NoteSheet the QuickAction opens.
    expect(await screen.findByPlaceholderText('What did you notice?')).toBeInTheDocument();
  });
});
