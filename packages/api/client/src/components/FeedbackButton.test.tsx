import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FeedbackButton } from './FeedbackButton';
import { DialogProvider } from '../context/DialogContext';

function renderButton() {
  return render(
    <MemoryRouter>
      <DialogProvider>
        <FeedbackButton />
      </DialogProvider>
    </MemoryRouter>,
  );
}

// JSDOM doesn't implement createObjectURL / revokeObjectURL.
beforeEach(() => {
  (URL as unknown as { createObjectURL: (f: Blob) => string }).createObjectURL = vi.fn(
    () => 'blob:mock',
  );
  (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = vi.fn();
  vi.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ id: 1, images: [] }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FeedbackButton image picker', () => {
  it('renders the image picker control in the form', async () => {
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: /send feedback/i }));
    expect(screen.getByText(/Attach image/i)).toBeInTheDocument();
  });

  it('shows a thumbnail after picking an image', async () => {
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: /send feedback/i }));

    const input = screen.getByTestId('feedback-image-input') as HTMLInputElement;
    const file = new File(['x'], 'shot.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByAltText(/attachment 1 preview/i)).toBeInTheDocument();
  });

  it('rejects images larger than 5MB with a friendly error', async () => {
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: /send feedback/i }));

    const input = screen.getByTestId('feedback-image-input') as HTMLInputElement;
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', {
      type: 'image/png',
    });
    fireEvent.change(input, { target: { files: [big] } });

    expect(screen.getByRole('alert')).toHaveTextContent(/5MB/i);
    expect(screen.queryByAltText(/attachment 1 preview/i)).not.toBeInTheDocument();
  });

  it('submits as multipart/form-data when an image is attached', async () => {
    renderButton();
    await userEvent.click(screen.getByRole('button', { name: /send feedback/i }));

    // Fill required fields
    await userEvent.type(screen.getByPlaceholderText(/what's up/i), 'Bad radio');

    const input = screen.getByTestId('feedback-image-input') as HTMLInputElement;
    const file = new File(['x'], 'shot.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    // Submit button inside the sheet
    const submit = screen.getAllByRole('button', { name: /send feedback/i }).pop()!;
    await userEvent.click(submit);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const call = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = call[0];
    const init = call[1] as RequestInit;
    expect(url).toBe('/api/feedback');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    const fd = init.body as FormData;
    expect(fd.get('title')).toBe('Bad radio');
    expect(fd.getAll('images')).toHaveLength(1);
  });
});
