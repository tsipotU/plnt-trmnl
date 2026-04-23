import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CalibrationSequence } from './CalibrationSequence';

function mockFetch(url: string) {
  if (url === '/api/plants/1/calibration/next') {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 10,
          plant_id: 1,
          question_text: 'How firm is the soil?',
          scale_min_label: 'Wet',
          scale_max_label: 'Dry',
        }),
    });
  }
  if (url === '/api/plants/2/calibration/next') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ skip: true, reason: 'converged' }),
    });
  }
  if (url === '/api/plants/3/calibration/next') {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 30,
          plant_id: 3,
          question_text: 'Soil dry?',
          scale_min_label: 'Damp',
          scale_max_label: 'Dry',
        }),
    });
  }
  return Promise.resolve({ ok: false });
}

describe('CalibrationSequence', () => {
  it('walks through non-converged plants and skips converged ones', async () => {
    const onComplete = vi.fn();
    global.fetch = vi.fn((url: string) => mockFetch(url)) as unknown as typeof fetch;

    render(
      <CalibrationSequence
        plantIds={[1, 2, 3]}
        plantNames={{ 1: 'A', 2: 'B', 3: 'C' }}
        onComplete={onComplete}
      />,
    );

    await waitFor(() =>
      expect(screen.getByText(/How firm is the soil/)).toBeInTheDocument(),
    );
    // plant 2 is skipped, so the queue shows 2 real questions
    expect(screen.getByText(/1 of 2/)).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('calls onComplete immediately when every plant is converged', async () => {
    const onComplete = vi.fn();
    global.fetch = vi.fn((url: string) => {
      if (url.endsWith('/calibration/next')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ skip: true, reason: 'converged' }),
        });
      }
      return Promise.resolve({ ok: false });
    }) as unknown as typeof fetch;

    render(<CalibrationSequence plantIds={[4, 5]} onComplete={onComplete} />);

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });
});
