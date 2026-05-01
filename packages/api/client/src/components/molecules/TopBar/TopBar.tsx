import type { HTMLAttributes, ReactNode } from 'react';
import { Wordmark } from '../../atoms/Logo/Wordmark';
import './TopBar.css';

export interface TopBarProps extends HTMLAttributes<HTMLElement> {
  /** Mono-tracked status caption next to the wordmark (e.g. "private · 9 active"). */
  meta?: ReactNode;
  /** Render the hamburger trigger. Pair with `onMenu`. */
  showMenu?: boolean;
  onMenu?: () => void;
  /** Custom right-side content (replaces the default burger). */
  right?: ReactNode;
}

/* App-shell header. Brand wordmark + meta caption + menu trigger.
   Per the prototype, the top padding accounts for the device safe area;
   we leave that handled by the parent layout to keep the molecule
   composable in browser, PWA, and Storybook contexts. */
export function TopBar({
  meta,
  showMenu = true,
  onMenu,
  right,
  className = '',
  ...rest
}: TopBarProps) {
  return (
    <header className={`p7l-topbar ${className}`.trim()} {...rest}>
      <div className="p7l-topbar__brand">
        <Wordmark size={18} />
        {meta && <span className="p7l-topbar__meta">{meta}</span>}
      </div>
      {right ?? (showMenu && onMenu && (
        <button
          type="button"
          className="p7l-topbar__burger"
          onClick={onMenu}
          aria-label="Open menu"
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      ))}
    </header>
  );
}
