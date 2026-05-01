import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { Link, useLocation } from 'react-router-dom';

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
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 20,
          }}
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
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(85vw, 320px)',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 180ms ease-out',
          zIndex: 21,
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
          paddingTop: 24,
        }}
      >
        {/* Routes intentionally not listed here:
              - "/" Today           — Header logo links to / (also acts as fallback)
              - "/plants/:id"       — reached from Today + Plants list rows
              - "/archive/:id"      — reached from Archive rows
              - "/feedback/:id"     — reached from Feedback rows
              - "/welcome", "/login" — auth bootstrap, outside the chrome by design */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <Link to="/add" style={drawerLinkStyle}>Add plant</Link>
          <Link to="/plants" style={drawerLinkStyle}>Plants</Link>
          <Link to="/calendar" style={drawerLinkStyle}>Calendar</Link>
          <Link to="/archived" style={drawerLinkStyle}>Archive</Link>
          <Link to="/feedback" style={drawerLinkStyle}>Feedback</Link>
          <Link to="/settings" style={drawerLinkStyle}>Settings</Link>
          <Link to="/setup" style={drawerLinkStyle}>TRMNL setup</Link>
          <Link to="/preview" style={drawerLinkStyle}>TRMNL preview</Link>
          <Link to="/about" style={drawerLinkStyle}>About</Link>
        </nav>
        <button
          type="button"
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.assign('/login');
          }}
          style={{
            ...drawerLinkStyle,
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            textAlign: 'left',
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          Log out
        </button>
      </aside>
    </>
  );
}

const drawerLinkStyle: React.CSSProperties = {
  display: 'block',
  padding: '12px 8px',
  minHeight: 44,
  color: 'var(--text-primary)',
  fontSize: 16,
  textDecoration: 'none',
  borderRadius: 6,
};
