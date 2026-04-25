import type { Ref } from 'react';

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
      style={{
        width: 44,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        color: 'var(--text-primary)',
        fontSize: 24,
        lineHeight: 1,
        cursor: 'pointer',
        padding: 0,
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
      }}
    >
      <span aria-hidden="true">≡</span>
    </button>
  );
}
