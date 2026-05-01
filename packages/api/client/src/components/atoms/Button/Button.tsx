import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import './Button.css';

export type ButtonVariant =
  | 'primary'      // sage --accent — default action (save, confirm, log)
  | 'highlight'    // copper --highlight — ceremonial (water now, mark watered)
  | 'secondary'    // outline + ink-2 — companion action
  | 'ghost'        // text-only ink — back, dismiss, low-emphasis
  | 'destructive'; // rust — archive, delete

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to fill the parent container's width. */
  fullWidth?: boolean;
  /** Show a loading spinner; the button remains its label width to prevent layout shift. */
  loading?: boolean;
  /** Icon node placed before the label. Pass a <Pictogram /> or any small SVG. */
  iconLeading?: ReactNode;
  /** Icon node placed after the label. */
  iconTrailing?: ReactNode;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled,
    iconLeading,
    iconTrailing,
    className = '',
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const classes = [
    'p7l-button',
    `p7l-button--${variant}`,
    `p7l-button--${size}`,
    fullWidth && 'p7l-button--full',
    loading && 'p7l-button--loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="p7l-button__spinner" aria-hidden="true" />}
      <span className="p7l-button__inner">
        {iconLeading && <span className="p7l-button__icon">{iconLeading}</span>}
        <span className="p7l-button__label">{children}</span>
        {iconTrailing && <span className="p7l-button__icon">{iconTrailing}</span>}
      </span>
    </button>
  );
});
