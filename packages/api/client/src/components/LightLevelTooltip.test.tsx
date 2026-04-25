import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LightLevelTooltip } from './LightLevelTooltip';

describe('LightLevelTooltip (#129)', () => {
  it('lists all four light levels when opened', () => {
    render(<LightLevelTooltip />);
    fireEvent.click(screen.getByRole('button', { name: /Light level help/i }));
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Bright indirect')).toBeInTheDocument();
    expect(screen.getByText('Direct')).toBeInTheDocument();
  });

  it('closes when the close button is clicked', () => {
    render(<LightLevelTooltip />);
    fireEvent.click(screen.getByRole('button', { name: /Light level help/i }));
    expect(screen.getByText('Low')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Close$/i }));
    expect(screen.queryByText('Low')).not.toBeInTheDocument();
  });
});
