import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Settings } from './Settings';
import { DEV_INFO_STORAGE_KEY } from '../hooks/useDevInfo';

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <Settings />
    </MemoryRouter>,
  );
}

describe('Settings page', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders a Developer section with a "Show developer info" toggle', () => {
    renderSettings();
    expect(screen.getByRole('heading', { name: /developer/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /show developer info/i })).toBeInTheDocument();
  });

  it('defaults the developer toggle to OFF', () => {
    renderSettings();
    const toggle = screen.getByRole('switch', { name: /show developer info/i });
    expect(toggle).not.toBeChecked();
  });

  it('persists the toggle to localStorage when switched ON', async () => {
    const user = userEvent.setup();
    renderSettings();
    const toggle = screen.getByRole('switch', { name: /show developer info/i });

    await user.click(toggle);

    expect(toggle).toBeChecked();
    expect(localStorage.getItem(DEV_INFO_STORAGE_KEY)).toBe('true');
  });

  it('round-trips the toggle state across unmount/remount', async () => {
    const user = userEvent.setup();
    const { unmount } = renderSettings();
    const toggle = screen.getByRole('switch', { name: /show developer info/i });
    await user.click(toggle);
    expect(toggle).toBeChecked();
    unmount();

    renderSettings();
    const remounted = screen.getByRole('switch', { name: /show developer info/i });
    expect(remounted).toBeChecked();
  });

  it('clears the flag when toggled back OFF', async () => {
    localStorage.setItem(DEV_INFO_STORAGE_KEY, 'true');
    const user = userEvent.setup();
    renderSettings();
    const toggle = screen.getByRole('switch', { name: /show developer info/i });
    expect(toggle).toBeChecked();

    await user.click(toggle);

    expect(toggle).not.toBeChecked();
    expect(localStorage.getItem(DEV_INFO_STORAGE_KEY)).toBe('false');
  });
});

describe('Settings — Connect your AI', () => {
  beforeEach(() => {
    // Clear any prior fetch mock
    localStorage.clear();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/facts/samples')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 1, text: 'Sample fact alpha.' }, { id: 2, text: 'Sample fact bravo.' }]) });
      }
      if (url.includes('/api/plants?enrichment=pending')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 1 }, { id: 2 }, { id: 3 }]) });
      }
      if (url.includes('/api/conditions?care_update=pending')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 99 }]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }) as typeof fetch;
  });

  it('renders the Connect your AI heading + Copy button', async () => {
    renderSettings();
    expect(await screen.findByRole('heading', { name: /Connect your AI/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Copy AI setup prompt/i })).toBeInTheDocument();
  });

  it('clicking the button writes the prompt to clipboard with current origin', async () => {
    // userEvent.setup() installs the clipboard stub on navigator — spy AFTER setup()
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    renderSettings();
    const btn = await screen.findByRole('button', { name: /Copy AI setup prompt/i });
    await user.click(btn);
    expect(writeText).toHaveBeenCalledTimes(1);
    const arg = writeText.mock.calls[0][0] as string;
    expect(arg).toContain(window.location.origin);
    expect(arg).toContain('/api/plants?enrichment=pending');
    expect(arg).toContain('Sample fact alpha.');
  });

  it('shows the pending counts with correct pluralization', async () => {
    renderSettings();
    expect(await screen.findByText(/3 plants pending enrichment/i)).toBeInTheDocument();
    expect(await screen.findByText(/1 condition awaiting care update/i)).toBeInTheDocument();
  });

  it('shows a manual-copy fallback when clipboard write fails', async () => {
    const user = userEvent.setup();
    renderSettings();
    const btn = await screen.findByRole('button', { name: /Copy AI setup prompt/i });

    // Make clipboard reject for this test
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('denied'));

    await user.click(btn);
    expect(await screen.findByText(/copy manually/i)).toBeInTheDocument();
  });
});
