/**
 * NoteSheet save flow — POST /api/plants/:id/notes; onSaved + onClose fire on
 * 201, onError fires on failure. Coverage gap filled while investigating #160
 * (which turned out to be a discoverability bug, not a save bug — see #176).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteSheet } from './PlantDetailSheets';

global.fetch = vi.fn();

describe('NoteSheet save flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs the note to /api/plants/:id/notes and fires onSaved on 201', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        id: 1,
        plant_id: 7,
        body: 'Leaves looking droopy',
        created_at: '2026-05-06T10:00:00Z',
        updated_at: null,
      }),
    });

    const onSaved = vi.fn();
    const onClose = vi.fn();
    const onError = vi.fn();

    render(
      <NoteSheet
        open
        plantId={7}
        plantName="Monstera"
        onSaved={onSaved}
        onClose={onClose}
        onError={onError}
      />,
    );

    const textarea = screen.getByPlaceholderText('What did you notice?');
    await userEvent.type(textarea, 'Leaves looking droopy');

    const saveBtn = screen.getByRole('button', { name: /save note/i });
    await userEvent.click(saveBtn);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/plants/7/notes',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: 'Leaves looking droopy' }),
      }),
    );

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('fires onError when API returns non-ok', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'oops' }),
    });

    const onSaved = vi.fn();
    const onClose = vi.fn();
    const onError = vi.fn();

    render(
      <NoteSheet
        open
        plantId={7}
        plantName="Monstera"
        onSaved={onSaved}
        onClose={onClose}
        onError={onError}
      />,
    );

    await userEvent.type(screen.getByPlaceholderText('What did you notice?'), 'foo');
    await userEvent.click(screen.getByRole('button', { name: /save note/i }));

    expect(onSaved).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('Failed to save note');
  });
});
