import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArchiveDialog } from './ArchiveDialog';

describe('ArchiveDialog', () => {
  it('disables the confirm button when no reason is selected', () => {
    render(<ArchiveDialog onConfirm={() => {}} onCancel={() => {}} />);
    const confirm = screen.getByRole('button', { name: /confirm/i });
    expect(confirm).toBeDisabled();
  });
});
