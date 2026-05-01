import type { SVGAttributes } from 'react';
import { icons, type IconName } from './icons';
import './Pictogram.css';

export type PictogramSize = 16 | 20 | 24 | 32 | number;

export interface PictogramProps extends Omit<SVGAttributes<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: PictogramSize;
  stroke?: number;
  /** Accessible label. When omitted the icon is treated as decorative (aria-hidden). */
  label?: string;
}

export function Pictogram({
  name,
  size = 24,
  stroke = 1.5,
  label,
  className = '',
  ...rest
}: PictogramProps) {
  const path = icons[name];
  const accessibility = label
    ? { role: 'img' as const, 'aria-label': label }
    : { 'aria-hidden': true as const };

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={`p7l-pictogram ${className}`.trim()}
      {...accessibility}
      {...rest}
    >
      {path}
    </svg>
  );
}

export { ICON_NAMES, type IconName } from './icons';
