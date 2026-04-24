import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { Routes, Route, Link, MemoryRouter } from 'react-router-dom';
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

describe('MenuDrawer — close affordances', () => {
  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <MenuDrawer open={true} onClose={onClose} />
      </MemoryRouter>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on Escape when closed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <MenuDrawer open={false} onClose={onClose} />
      </MemoryRouter>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <MenuDrawer open={true} onClose={onClose} />
      </MemoryRouter>,
    );
    const backdrop = document.querySelector<HTMLDivElement>('[data-testid="menu-backdrop"]');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the route changes', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <MenuDrawer open={true} onClose={onClose} />
        <Routes>
          <Route path="/" element={<Link to="/archived">go archived</Link>} />
          <Route path="/archived" element={<div>archived view</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('link', { name: /go archived/i }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('MenuDrawer — focus management', () => {
  it('focuses the first link when open transitions false→true', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <MenuDrawer open={false} onClose={() => {}} />
      </MemoryRouter>,
    );
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <MenuDrawer open={true} onClose={() => {}} />
      </MemoryRouter>,
    );
    const firstLink = screen.getByRole('link', { name: /add plant/i });
    expect(firstLink).toHaveFocus();
  });

  it('restores focus to the trigger button when closed', async () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      const triggerRef = useRef<HTMLButtonElement>(null);
      return (
        <MemoryRouter initialEntries={['/']}>
          <button ref={triggerRef} data-testid="trigger">menu</button>
          <MenuDrawer open={open} onClose={() => setOpen(false)} triggerRef={triggerRef} />
          <button onClick={() => setOpen(false)} data-testid="close-externally">close</button>
        </MemoryRouter>
      );
    }
    render(<Harness />);
    const close = screen.getByTestId('close-externally');
    const user = userEvent.setup();
    await user.click(close);
    const trigger = screen.getByTestId('trigger');
    expect(trigger).toHaveFocus();
  });

  it('wraps Tab from the last link back to the first', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <MenuDrawer open={true} onClose={() => {}} />
      </MemoryRouter>,
    );
    const addLink = screen.getByRole('link', { name: /add plant/i });
    const aboutLink = screen.getByRole('link', { name: /about/i });
    aboutLink.focus();
    expect(aboutLink).toHaveFocus();
    await user.tab();
    expect(addLink).toHaveFocus();
  });

  it('wraps Shift+Tab from the first link back to the last', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <MenuDrawer open={true} onClose={() => {}} />
      </MemoryRouter>,
    );
    const addLink = screen.getByRole('link', { name: /add plant/i });
    const aboutLink = screen.getByRole('link', { name: /about/i });
    addLink.focus();
    await user.tab({ shift: true });
    expect(aboutLink).toHaveFocus();
  });
});

describe('MenuDrawer — body scroll lock', () => {
  it('locks body scroll while open and restores on close', () => {
    const { rerender, unmount } = render(
      <MemoryRouter initialEntries={['/']}>
        <MenuDrawer open={false} onClose={() => {}} />
      </MemoryRouter>,
    );
    expect(document.body.style.overflow).toBe('');

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <MenuDrawer open={true} onClose={() => {}} />
      </MemoryRouter>,
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <MenuDrawer open={false} onClose={() => {}} />
      </MemoryRouter>,
    );
    expect(document.body.style.overflow).toBe('');

    unmount();
  });
});
