import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HamburgerMenu } from './HamburgerMenu';
import { MenuDrawer } from './MenuDrawer';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <header
        style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Link
          to="/"
          aria-label="PLNT home"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--text-primary)',
            fontWeight: 700,
            fontSize: 18,
            textDecoration: 'none',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1 }}>🪴</span>
          <span>PLNT</span>
        </Link>
        <HamburgerMenu
          ref={triggerRef}
          open={menuOpen}
          onToggle={() => setMenuOpen((v) => !v)}
        />
      </header>
      <MenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        triggerRef={triggerRef}
      />
    </>
  );
}
