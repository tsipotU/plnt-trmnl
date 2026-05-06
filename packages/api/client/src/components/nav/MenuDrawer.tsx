import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './MenuDrawer.css';

interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
  triggerRef?: RefObject<HTMLButtonElement | null>;
}

export function MenuDrawer({ open, onClose, triggerRef }: MenuDrawerProps) {
  const location = useLocation();
  const initialPathname = useRef(location.pathname);

  // Escape closes while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Route change closes (skip initial mount by comparing with initial pathname)
  useEffect(() => {
    if (open && location.pathname !== initialPathname.current) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const asideRef = useRef<HTMLElement>(null);

  // Focus on open / restore on close
  useEffect(() => {
    if (open) {
      const first = asideRef.current?.querySelector<HTMLElement>('a, button');
      first?.focus();
    } else {
      triggerRef?.current?.focus();
    }
  }, [open, triggerRef]);

  // Body scroll lock while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus trap
  function onKeyDownCapture(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key !== 'Tab') return;
    const focusables = asideRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      {open && (
        <div
          data-testid="menu-backdrop"
          aria-hidden="true"
          onClick={onClose}
          className="p7l-menu-drawer__scrim"
        />
      )}
      <aside
        ref={asideRef}
        id="main-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        aria-hidden={!open}
        onKeyDown={onKeyDownCapture}
        className="p7l-menu-drawer"
        data-open={open ? 'true' : 'false'}
      >
        {/* Routes intentionally not listed here:
              - "/" Today           — Header logo links to / (also acts as fallback)
              - "/plants/:id"       — reached from Today + Plants list rows
              - "/archive/:id"      — reached from Archive rows
              - "/feedback/:id"     — reached from Feedback rows
              - "/welcome", "/login" — auth bootstrap, outside the chrome by design */}
        <nav className="p7l-menu-drawer__nav">
          <Link to="/add" className="p7l-menu-drawer__link">Add plant</Link>
          <Link to="/plants" className="p7l-menu-drawer__link">Plants</Link>
          <Link to="/calendar" className="p7l-menu-drawer__link">Calendar</Link>
          <Link to="/archived" className="p7l-menu-drawer__link">Archive</Link>
          <Link to="/feedback" className="p7l-menu-drawer__link">Feedback</Link>
          <Link to="/settings" className="p7l-menu-drawer__link">Settings</Link>
          <Link to="/setup" className="p7l-menu-drawer__link">TRMNL setup</Link>
          <Link to="/preview" className="p7l-menu-drawer__link">TRMNL preview</Link>
          <Link to="/about" className="p7l-menu-drawer__link">About</Link>
        </nav>
        <button
          type="button"
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.assign('/login');
          }}
          className="p7l-menu-drawer__logout"
        >
          Log out
        </button>
      </aside>
    </>
  );
}
