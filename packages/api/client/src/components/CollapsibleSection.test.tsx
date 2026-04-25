import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapsibleSection } from './CollapsibleSection';

describe('CollapsibleSection', () => {
  it('renders expanded by default and shows children', () => {
    render(
      <CollapsibleSection title="Light">
        <p>light content</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('light content')).toBeInTheDocument();
  });

  it('collapses on header click and hides children', async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSection title="Light">
        <p>light content</p>
      </CollapsibleSection>,
    );
    await user.click(screen.getByRole('button', { name: /Light/ }));
    expect(screen.queryByText('light content')).not.toBeInTheDocument();
  });

  it('reflects state via aria-expanded on the header button', async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSection title="Light">
        <p>light content</p>
      </CollapsibleSection>,
    );
    const btn = screen.getByRole('button', { name: /Light/ });
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    await user.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('respects defaultCollapsed prop', () => {
    render(
      <CollapsibleSection title="History" defaultCollapsed>
        <p>history content</p>
      </CollapsibleSection>,
    );
    expect(screen.queryByText('history content')).not.toBeInTheDocument();
  });

  it('toggles via Enter key on focused header', async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSection title="Light">
        <p>light content</p>
      </CollapsibleSection>,
    );
    const btn = screen.getByRole('button', { name: /Light/ });
    btn.focus();
    await user.keyboard('{Enter}');
    expect(screen.queryByText('light content')).not.toBeInTheDocument();
  });
});
