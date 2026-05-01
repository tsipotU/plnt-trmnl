import type { LabelHTMLAttributes, ReactNode } from 'react';
import './FieldLabel.css';

export interface FieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  required?: boolean;
  hint?: ReactNode;
}

export function FieldLabel({
  children,
  required = false,
  hint,
  className = '',
  ...rest
}: FieldLabelProps) {
  return (
    <label className={`p7l-field-label ${className}`.trim()} {...rest}>
      <span className="p7l-field-label__row">
        <span className="p7l-field-label__text">{children}</span>
        {required && <span className="p7l-field-label__required" aria-hidden="true">·</span>}
      </span>
      {hint && <span className="p7l-field-label__hint">{hint}</span>}
    </label>
  );
}
