import type { ReactNode, ElementType, HTMLAttributes } from 'react';
import './Eyebrow.css';

export type EyebrowSize = 'sm' | 'md';

export interface EyebrowProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  size?: EyebrowSize;
  as?: ElementType;
}

export function Eyebrow({
  children,
  size = 'md',
  as: Tag = 'span',
  className = '',
  ...rest
}: EyebrowProps) {
  return (
    <Tag className={`p7l-eyebrow p7l-eyebrow--${size} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
