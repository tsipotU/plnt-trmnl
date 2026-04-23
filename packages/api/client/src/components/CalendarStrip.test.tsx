import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarStrip } from './CalendarStrip';

const days = [
  { date: '2026-04-22', is_today: true, plant_ids: [1], plant_names: ['Monstera'], count: 1, overdue_ids: [], vacation: false },
  { date: '2026-04-23', is_today: false, plant_ids: [], plant_names: [], count: 0, overdue_ids: [], vacation: false },
  { date: '2026-04-24', is_today: false, plant_ids: [2, 3], plant_names: ['Pothos', 'Snake'], count: 2, overdue_ids: [], vacation: false },
  { date: '2026-04-25', is_today: false, plant_ids: [], plant_names: [], count: 0, overdue_ids: [], vacation: false },
  { date: '2026-04-26', is_today: false, plant_ids: [], plant_names: [], count: 0, overdue_ids: [], vacation: false },
  { date: '2026-04-27', is_today: false, plant_ids: [], plant_names: [], count: 0, overdue_ids: [], vacation: false },
  { date: '2026-04-28', is_today: false, plant_ids: [], plant_names: [], count: 0, overdue_ids: [], vacation: false },
];

describe('CalendarStrip', () => {
  it('renders 7 day cells', () => {
    render(<CalendarStrip days={days} />);
    expect(screen.getByText('22')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
  });

  it('expands a day on click to show plant names', async () => {
    const user = userEvent.setup();
    render(<CalendarStrip days={days} />);
    await user.click(screen.getByText('24'));
    expect(screen.getByText(/Pothos/)).toBeInTheDocument();
    expect(screen.getByText(/Snake/)).toBeInTheDocument();
  });
});
