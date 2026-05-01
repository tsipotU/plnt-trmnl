import { useEffect, type HTMLAttributes, type ReactNode } from 'react';
import './Sheet.css';

export interface SheetProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  open: boolean;
  onClose: () => void;
  /** Display-font title in the sheet header. Pair with the close × button (auto-rendered). */
  title?: ReactNode;
  /** Optional footer slot (typically Cancel + primary action buttons). */
  footer?: ReactNode;
  /** Max-height as a CSS length. Default '88%'. Override for short sheets like Note. */
  maxHeight?: string;
  /** Hide the close × button in the header. Default false. */
  closeOnEscape?: boolean;
  children: ReactNode;
}

/* Bottom-sheet modal scaffolding. Base for CalibrationModal, ConditionsModal,
   NoteModal, PhotoModal, ArchiveModal — each composes Sheet with its own
   body content and footer.
   Closes on backdrop click and (optionally) Escape. */
export function Sheet({
  open,
  onClose,
  title,
  footer,
  maxHeight = '88%',
  closeOnEscape = true,
  className = '',
  children,
  ...rest
}: SheetProps) {
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, closeOnEscape]);

  if (!open) return null;

  return (
    <div
      className="p7l-sheet__bg"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`p7l-sheet ${className}`.trim()}
        style={{ maxHeight }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        onClick={(e) => e.stopPropagation()}
        {...rest}
      >
        {title !== undefined && (
          <header className="p7l-sheet__header">
            <span className="p7l-sheet__title">{title}</span>
            <button
              type="button"
              className="p7l-sheet__close"
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </button>
          </header>
        )}
        <div className="p7l-sheet__body">{children}</div>
        {footer && <footer className="p7l-sheet__footer">{footer}</footer>}
      </div>
    </div>
  );
}
