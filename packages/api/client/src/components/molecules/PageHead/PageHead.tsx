import type { HTMLAttributes, ReactNode } from 'react';
import { Eyebrow } from '../../atoms/Eyebrow/Eyebrow';
import './PageHead.css';

export type PageHeadSize = 'lg' | 'sm';

export interface PageHeadProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Mono-tracked context line above the title. Pass a string or arbitrary node. */
  eyebrow?: ReactNode;
  /** Page title (h1). Display font, tight tracking. */
  title: ReactNode;
  /** Optional italic-serif lede beneath the title. */
  subtitle?: ReactNode;
  /** lg = 30px hero (default), sm = 24px for nested screens. */
  size?: PageHeadSize;
  /** When true, adds top padding for use without a TopBar/BackBar above. */
  solo?: boolean;
}

export function PageHead({
  eyebrow,
  title,
  subtitle,
  size = 'lg',
  solo = false,
  className = '',
  ...rest
}: PageHeadProps) {
  const classes = [
    'p7l-pagehead',
    `p7l-pagehead--${size}`,
    solo && 'p7l-pagehead--solo',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={classes} {...rest}>
      {eyebrow && <Eyebrow size="sm" className="p7l-pagehead__eyebrow">{eyebrow}</Eyebrow>}
      <h1 className="p7l-pagehead__title">{title}</h1>
      {subtitle && <p className="p7l-pagehead__subtitle">{subtitle}</p>}
    </header>
  );
}
