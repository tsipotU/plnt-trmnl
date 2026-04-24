import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HamburgerMenu } from './HamburgerMenu';

describe('HamburgerMenu', () => {
  it('reflects open=false as aria-expanded="false" and labels the button "Open menu"', () => {
    render(<HamburgerMenu open={false} onToggle={() => {}} />);
    const button = screen.getByRole('button', { name: /open menu/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', 'main-menu');
  });

  it('reflects open=true as aria-expanded="true" and labels the button "Close menu"', () => {
    render(<HamburgerMenu open={true} onToggle={() => {}} />);
    const button = screen.getByRole('button', { name: /close menu/i });
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onToggle exactly once when clicked', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<HamburgerMenu open={false} onToggle={onToggle} />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
