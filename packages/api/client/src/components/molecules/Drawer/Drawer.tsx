import { useEffect, type HTMLAttributes, type ReactNode } from 'react';
import './Drawer.css';

export interface DrawerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  open: boolean;
  onClose: () => void;
  /** Mono eyebrow header at the top of the drawer (e.g. "Navigate"). */
  title?: ReactNode;
  /** Optional footer content. Sits at the bottom with a hairline rule. */
  footer?: ReactNode;
  children: ReactNode;
}

/* Right-side slide-in drawer with backdrop. Used as the primary
   navigation expand. Closes on backdrop click and Escape. */
export function Drawer({
  open,
  onClose,
  title,
  footer,
  className = '',
  children,
  ...rest
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="p7l-drawer__bg"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`p7l-drawer ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Navigation'}
        {...rest}
      >
        {title && <div className="p7l-drawer__title">{title}</div>}
        <nav className="p7l-drawer__nav">{children}</nav>
        {footer && <div className="p7l-drawer__footer">{footer}</div>}
      </aside>
    </>
  );
}

export interface DrawerLinkProps {
  /** Visible label on the left. */
  children: ReactNode;
  /** Mono-tracked meta text on the right (e.g. count, status). */
  meta?: ReactNode;
  /** Active highlight (3px ink border-left). */
  active?: boolean;
  onClick?: () => void;
}

export function DrawerLink({ children, meta, active, onClick }: DrawerLinkProps) {
  return (
    <button
      type="button"
      className={['p7l-drawer__link', active && 'p7l-drawer__link--active'].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      <span>{children}</span>
      {meta && <span className="p7l-drawer__link-meta">{meta}</span>}
    </button>
  );
}
