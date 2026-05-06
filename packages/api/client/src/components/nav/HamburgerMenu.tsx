import type { Ref } from 'react';
import './HamburgerMenu.css';

interface HamburgerMenuProps {
  open: boolean;
  onToggle: () => void;
  ref?: Ref<HTMLButtonElement>;
}

export function HamburgerMenu({ open, onToggle, ref }: HamburgerMenuProps) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="main-menu"
      aria-label={open ? 'Close menu' : 'Open menu'}
      className="p7l-hamburger"
    >
      <span aria-hidden="true" className="p7l-hamburger__bars">
        <span className="p7l-hamburger__bar p7l-hamburger__bar--top" />
        <span className="p7l-hamburger__bar p7l-hamburger__bar--middle" />
        <span className="p7l-hamburger__bar p7l-hamburger__bar--bottom" />
      </span>
    </button>
  );
}
