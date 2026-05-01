import { useEffect, type HTMLAttributes, type ReactNode } from 'react';
import './Toast.css';

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  /** When true, the toast is mounted and visible. Parent controls timing. */
  open: boolean;
  message: ReactNode;
  /** Optional inline action (typically an Undo button). */
  action?: ReactNode;
  /** Auto-dismiss after this many ms. 0 disables auto-dismiss. */
  durationMs?: number;
  onDismiss?: () => void;
}

/* Bottom-centered toast — ink-on-paper inverted, mono action button.
   Parent controls visibility (`open`); `durationMs` triggers an automatic
   onDismiss after the timer elapses. Place inside a relatively-positioned
   container (the m-app stage); fixed positioning at viewport bottom. */
export function Toast({
  open,
  message,
  action,
  durationMs = 1800,
  onDismiss,
  className = '',
  ...rest
}: ToastProps) {
  useEffect(() => {
    if (!open || durationMs === 0) return;
    const id = setTimeout(() => onDismiss?.(), durationMs);
    return () => clearTimeout(id);
  }, [open, durationMs, onDismiss]);

  if (!open) return null;

  return (
    <div
      className={`p7l-toast ${className}`.trim()}
      role="status"
      aria-live="polite"
      {...rest}
    >
      <span className="p7l-toast__msg">{message}</span>
      {action && <span className="p7l-toast__action">{action}</span>}
    </div>
  );
}
