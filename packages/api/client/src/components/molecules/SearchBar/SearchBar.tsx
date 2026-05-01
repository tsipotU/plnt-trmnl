import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import './SearchBar.css';

export interface SearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: string;
  onChange: (next: string) => void;
  /** Optional leading icon (typically <Pictogram name="search" />). */
  iconLeading?: ReactNode;
  /** Render a clear (×) button when value is non-empty. */
  clearable?: boolean;
}

/* Search input row — full-width, hairline below, 0.5px ink border on the input.
   Square corners (no border-radius); accent outline on focus. */
export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  {
    value,
    onChange,
    placeholder = 'Search…',
    iconLeading,
    clearable = true,
    className = '',
    ...rest
  },
  ref,
) {
  return (
    <div className={`p7l-searchbar ${className}`.trim()}>
      {iconLeading && <span className="p7l-searchbar__icon">{iconLeading}</span>}
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="p7l-searchbar__input"
        {...rest}
      />
      {clearable && value.length > 0 && (
        <button
          type="button"
          aria-label="Clear search"
          className="p7l-searchbar__clear"
          onClick={() => onChange('')}
        >
          ×
        </button>
      )}
    </div>
  );
});
