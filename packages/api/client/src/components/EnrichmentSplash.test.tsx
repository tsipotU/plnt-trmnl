import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnrichmentSplash } from './EnrichmentSplash';

const noopHandlers = {
  onLooksRight: vi.fn(),
  onNotQuite: vi.fn(),
  onSubmitCorrection: vi.fn(),
  onCancelCorrection: vi.fn(),
};

describe('EnrichmentSplash — no-match mode (#130)', () => {
  it('renders the typed name and a "Continue" / "Try a different name" pair', () => {
    render(
      <EnrichmentSplash
        mode="no-match"
        typedName="weird plant"
        preview={null}
        submitting={false}
        {...noopHandlers}
      />,
    );
    expect(screen.getByText(/We don.?t have detailed info yet/i)).toBeInTheDocument();
    expect(screen.getByText('weird plant')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try a different name/i })).toBeInTheDocument();
  });

  it('Continue triggers onLooksRight', async () => {
    const onLooksRight = vi.fn();
    const user = userEvent.setup();
    render(
      <EnrichmentSplash
        mode="no-match"
        typedName="weird plant"
        preview={null}
        submitting={false}
        {...noopHandlers}
        onLooksRight={onLooksRight}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Continue/i }));
    expect(onLooksRight).toHaveBeenCalledTimes(1);
  });

  it('Try-a-different-name triggers onNotQuite (correction flow)', async () => {
    const onNotQuite = vi.fn();
    const user = userEvent.setup();
    render(
      <EnrichmentSplash
        mode="no-match"
        typedName="weird plant"
        preview={null}
        submitting={false}
        {...noopHandlers}
        onNotQuite={onNotQuite}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Try a different name/i }));
    expect(onNotQuite).toHaveBeenCalledTimes(1);
  });
});
