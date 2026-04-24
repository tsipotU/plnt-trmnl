import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MenuDrawer } from './MenuDrawer';

function renderDrawer(open: boolean, onClose = vi.fn()) {
  const result = render(
    <MemoryRouter initialEntries={['/']}>
      <MenuDrawer open={open} onClose={onClose} />
    </MemoryRouter>,
  );
  return { ...result, onClose };
}

describe('MenuDrawer — skeleton', () => {
  it('renders an aside with role="dialog" and aria-label="Main menu"', () => {
    renderDrawer(true);
    const dialog = screen.getByRole('dialog', { name: /main menu/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('id', 'main-menu');
  });

  it('reflects open=false via aria-hidden="true"', () => {
    renderDrawer(false);
    const dialog = document.getElementById('main-menu');
    expect(dialog).toHaveAttribute('aria-hidden', 'true');
  });

  it('reflects open=true via aria-hidden="false"', () => {
    renderDrawer(true);
    const dialog = screen.getByRole('dialog', { name: /main menu/i });
    expect(dialog).toHaveAttribute('aria-hidden', 'false');
  });

  it('renders all six navigation links when open', () => {
    renderDrawer(true);
    expect(screen.getByRole('link', { name: /add plant/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /archive/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /feedback/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /setup/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument();
  });

  it('renders a backdrop only when open', () => {
    const { rerender } = renderDrawer(false);
    expect(document.querySelector('[data-testid="menu-backdrop"]')).toBeNull();

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <MenuDrawer open={true} onClose={() => {}} />
      </MemoryRouter>,
    );
    expect(document.querySelector('[data-testid="menu-backdrop"]')).not.toBeNull();
  });
});
