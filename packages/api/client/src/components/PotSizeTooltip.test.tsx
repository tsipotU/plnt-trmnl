import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PotSizeTooltip } from './PotSizeTooltip';

describe('PotSizeTooltip (#129)', () => {
  it('opens with body-anchored size guide', () => {
    render(<PotSizeTooltip />);
    fireEvent.click(screen.getByRole('button', { name: /estimate pot diameter/i }));
    expect(screen.getByText(/Measure across the top/i)).toBeInTheDocument();
    expect(screen.getAllByText(/spread hand/i).length).toBeGreaterThan(0);
  });

  it('lists four size buckets', () => {
    render(<PotSizeTooltip />);
    fireEvent.click(screen.getByRole('button', { name: /estimate pot diameter/i }));
    expect(screen.getByText(/^Small/i)).toBeInTheDocument();
    expect(screen.getByText(/^Medium/i)).toBeInTheDocument();
    expect(screen.getByText(/^Large/i)).toBeInTheDocument();
    expect(screen.getByText(/^Extra large/i)).toBeInTheDocument();
  });

  it('closes when the close button is clicked', () => {
    render(<PotSizeTooltip />);
    fireEvent.click(screen.getByRole('button', { name: /estimate pot diameter/i }));
    expect(screen.getByText(/Measure across/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Close$/i }));
    expect(screen.queryByText(/Measure across/i)).not.toBeInTheDocument();
  });
});
