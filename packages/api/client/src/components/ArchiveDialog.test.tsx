import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArchiveDialog } from './ArchiveDialog';
import { DialogProvider } from '../context/DialogContext';

describe('ArchiveDialog', () => {
  it('disables the confirm button when no reason is selected', () => {
    render(
      <DialogProvider>
        <ArchiveDialog onConfirm={() => {}} onCancel={() => {}} />
      </DialogProvider>
    );
    const confirm = screen.getByRole('button', { name: /confirm/i });
    expect(confirm).toBeDisabled();
  });
});
