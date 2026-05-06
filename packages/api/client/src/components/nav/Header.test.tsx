import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Header } from './Header';

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Header />
    </MemoryRouter>,
  );
}

describe('Header', () => {
  it('renders a home link labelled "p7l home" containing the wordmark', () => {
    renderHeader();
    const home = screen.getByRole('link', { name: /p7l home/i });
    expect(home).toHaveAttribute('href', '/');
    expect(home).toHaveTextContent('p7l');
  });

  it('does not show drawer contents by default (aria-hidden)', () => {
    renderHeader();
    const dialog = document.getElementById('main-menu');
    expect(dialog).toHaveAttribute('aria-hidden', 'true');
  });

  it('opens the drawer when the hamburger is clicked', async () => {
    const user = userEvent.setup();
    renderHeader();
    const hamburger = screen.getByRole('button', { name: /open menu/i });
    await user.click(hamburger);
    const dialog = screen.getByRole('dialog', { name: /main menu/i });
    expect(dialog).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument();
  });
});
