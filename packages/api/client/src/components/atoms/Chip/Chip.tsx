import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  MouseEventHandler,
  ReactNode,
} from 'react';
import './Chip.css';

export type ChipTone = 'neutral' | 'due' | 'overdue' | 'healthy' | 'dormant';

interface BaseChipProps {
  tone?: ChipTone;
  /** Show the leading dot indicator. Defaults true for status tones, false for neutral. */
  dot?: boolean;
  /** Optional leading icon (e.g. <Pictogram />). Replaces the dot when present. */
  iconLeading?: ReactNode;
  children: ReactNode;
  className?: string;
}

interface StatusChipProps extends BaseChipProps, Omit<HTMLAttributes<HTMLSpanElement>, 'className'> {
  toggleable?: false;
  active?: never;
}

interface ToggleChipProps
  extends BaseChipProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  /** Render as an interactive filter chip (rectangular, ink-on-paper, inverts when active). */
  toggleable: true;
  /** Active (selected) state for the toggleable variant. */
  active?: boolean;
}

export type ChipProps = StatusChipProps | ToggleChipProps;

export function Chip(props: ChipProps) {
  if (props.toggleable) {
    const {
      tone, // ignored for toggleable
      dot, // ignored for toggleable
      iconLeading,
      active = false,
      children,
      className = '',
      onClick,
      type = 'button',
      ...rest
    } = props;
    void tone;
    void dot;

    return (
      <button
        type={type}
        aria-pressed={active}
        onClick={onClick as MouseEventHandler<HTMLButtonElement>}
        className={[
          'p7l-chip',
          'p7l-chip--toggle',
          active && 'p7l-chip--active',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {iconLeading && <span className="p7l-chip__icon">{iconLeading}</span>}
        <span className="p7l-chip__label">{children}</span>
      </button>
    );
  }

  const { tone = 'neutral', dot, iconLeading, children, className = '', ...rest } = props;
  const showDot = dot ?? (tone !== 'neutral' && !iconLeading);

  return (
    <span
      className={`p7l-chip p7l-chip--${tone} ${className}`.trim()}
      {...rest}
    >
      {iconLeading && <span className="p7l-chip__icon">{iconLeading}</span>}
      {showDot && <span className="p7l-chip__dot" aria-hidden="true" />}
      <span className="p7l-chip__label">{children}</span>
    </span>
  );
}
