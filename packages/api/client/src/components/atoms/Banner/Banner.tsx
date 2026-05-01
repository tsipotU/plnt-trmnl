import type { HTMLAttributes, ReactNode } from 'react';
import './Banner.css';

export type BannerTone = 'info' | 'success' | 'warning' | 'error' | 'neutral';

export interface BannerProps extends HTMLAttributes<HTMLDivElement> {
  tone?: BannerTone;
  /** Mono-eyebrow title above the body. Optional. */
  title?: ReactNode;
  /** Optional icon node placed before the text block. */
  icon?: ReactNode;
  /** Optional action node (Button, link) on the right side. */
  action?: ReactNode;
  /** Show a dismiss × button. Pair with `onDismiss`. */
  dismissible?: boolean;
  onDismiss?: () => void;
  children: ReactNode;
}

export function Banner({
  tone = 'info',
  title,
  icon,
  action,
  dismissible = false,
  onDismiss,
  className = '',
  children,
  ...rest
}: BannerProps) {
  const role = tone === 'error' || tone === 'warning' ? 'alert' : 'status';

  return (
    <div
      className={`p7l-banner p7l-banner--${tone} ${className}`.trim()}
      role={role}
      {...rest}
    >
      {icon && <div className="p7l-banner__icon">{icon}</div>}
      <div className="p7l-banner__content">
        {title && <div className="p7l-banner__title">{title}</div>}
        <div className="p7l-banner__body">{children}</div>
      </div>
      {(action || dismissible) && (
        <div className="p7l-banner__actions">
          {action}
          {dismissible && (
            <button
              type="button"
              className="p7l-banner__dismiss"
              onClick={onDismiss}
              aria-label="Dismiss"
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
