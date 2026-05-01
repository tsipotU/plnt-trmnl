import type { HTMLAttributes, ReactNode } from 'react';
import './FormStep.css';

export interface FormStepProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Step number / label (e.g. "01 · Name"). Mono uppercase tracked. */
  num: ReactNode;
  /** Step title. Display font, tight tracking. */
  title: ReactNode;
  children: ReactNode;
}

/* Numbered step block for multi-step forms (Add Plant, FeedbackNew).
   Mono step-num + display title + body of fields. Hairline rule below. */
export function FormStep({
  num,
  title,
  className = '',
  children,
  ...rest
}: FormStepProps) {
  return (
    <section className={`p7l-formstep ${className}`.trim()} {...rest}>
      <div className="p7l-formstep__num">{num}</div>
      <h2 className="p7l-formstep__title">{title}</h2>
      <div className="p7l-formstep__body">{children}</div>
    </section>
  );
}
