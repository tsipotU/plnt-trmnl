import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { About } from './About';

describe('About page', () => {
  it('renders a heading "About p7l"', () => {
    render(<About />);
    expect(screen.getByRole('heading', { level: 1, name: /about p7l/i })).toBeInTheDocument();
  });

  it('renders the tagline paragraph mentioning plant care', () => {
    render(<About />);
    expect(screen.getByText(/plant care companion/i)).toBeInTheDocument();
  });
});
