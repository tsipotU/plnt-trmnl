import type { HTMLAttributes, ReactNode } from 'react';
import './DetailDataGrid.css';

export interface DetailDataGridProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of columns. Default 2 (matches the prototype detail layout). */
  cols?: 2 | 3;
  children: ReactNode;
}

/* Two-column data grid with hairline cells. Used on Plant Detail and
   Memorial for read-only or lightly-editable property tables. Compose
   with <DataCell /> children. */
export function DetailDataGrid({
  cols = 2,
  children,
  className = '',
  ...rest
}: DetailDataGridProps) {
  return (
    <div
      className={`p7l-datagrid p7l-datagrid--cols-${cols} ${className}`.trim()}
      style={{ ...rest.style, gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface DataCellProps extends HTMLAttributes<HTMLDivElement> {
  /** Mono uppercase label. */
  label: ReactNode;
  /** Mono value below the label. */
  value: ReactNode;
  /** Render a dashed underline + cursor:text to hint editability. */
  editable?: boolean;
}

export function DataCell({
  label,
  value,
  editable = false,
  className = '',
  ...rest
}: DataCellProps) {
  return (
    <div className={`p7l-datagrid__cell ${className}`.trim()} {...rest}>
      <div className="p7l-datagrid__label">{label}</div>
      <div className={['p7l-datagrid__value', editable && 'p7l-datagrid__value--editable'].filter(Boolean).join(' ')}>
        {value}
      </div>
    </div>
  );
}
