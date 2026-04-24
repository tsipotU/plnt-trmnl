import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MenuDrawer({ open, onClose }: MenuDrawerProps) {
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
        id="main-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        aria-hidden={!open}
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
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Link to="/add" style={drawerLinkStyle}>Add plant</Link>
          <Link to="/archived" style={drawerLinkStyle}>Archive</Link>
          <Link to="/feedback" style={drawerLinkStyle}>Feedback</Link>
          <Link to="/settings" style={drawerLinkStyle}>Settings</Link>
          <Link to="/setup" style={drawerLinkStyle}>Setup</Link>
          <Link to="/about" style={drawerLinkStyle}>About</Link>
        </nav>
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
