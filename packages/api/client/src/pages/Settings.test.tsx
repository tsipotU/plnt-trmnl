import { describe, it, expect, beforeEach } from 'vitest';
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
