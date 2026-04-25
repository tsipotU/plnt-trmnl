import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Boom() { throw new Error('kaboom'); }

describe('ErrorBoundary', () => {
  it('renders fallback when child throws', () => {
    // Suppress React's expected error logging for this test.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
    spy.mockRestore();
  });

  it('renders children when no error', () => {
    render(<ErrorBoundary><div>hello</div></ErrorBoundary>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
