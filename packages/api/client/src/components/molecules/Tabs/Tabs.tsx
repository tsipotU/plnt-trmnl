import type { HTMLAttributes, ReactNode } from 'react';
import './Tabs.css';

export interface TabItem<T extends string = string> {
  /** Stable identifier; matches the `active` prop. */
  id: T;
  /** Visible label (mono uppercase tracking is applied automatically). */
  label: ReactNode;
  /** Optional micro-trail (e.g. count) shown under the label at smaller size. */
  meta?: ReactNode;
}

export interface TabsProps<T extends string = string>
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: ReadonlyArray<TabItem<T>>;
  active: T;
  onChange: (id: T) => void;
}

/* Horizontal tab bar — primary nav (Today/Plants/Cal/Archive/Set) and
   sub-nav inside modals. Equal-width segments with hairline separators
   and an ink underline on the active tab. Sans for UI legibility. */
export function Tabs<T extends string = string>({
  items,
  active,
  onChange,
  className = '',
  ...rest
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={`p7l-tabs ${className}`.trim()}
      {...rest}
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={['p7l-tabs__tab', isActive && 'p7l-tabs__tab--active'].filter(Boolean).join(' ')}
          >
            <span className="p7l-tabs__label">{item.label}</span>
            {item.meta && <span className="p7l-tabs__meta">{item.meta}</span>}
          </button>
        );
      })}
    </div>
  );
}
