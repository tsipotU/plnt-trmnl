import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HamburgerMenu } from './HamburgerMenu';
import { MenuDrawer } from './MenuDrawer';
import './Header.css';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      // 4px before the sentinel exits — avoids flicker on iOS rubber-band.
      { rootMargin: '-4px 0px 0px 0px', threshold: 1 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <div
        ref={sentinelRef}
        aria-hidden="true"
        className="p7l-nav-header__sentinel"
        data-testid="p7l-nav-header-sentinel"
      />
      <header
        className="p7l-nav-header"
        data-scrolled={scrolled || undefined}
      >
        <Link to="/" aria-label="p7l home" className="p7l-nav-header__brand">
          <span>p7l</span>
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
