import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarStrip } from './CalendarStrip';

// jsdom doesn't implement scrollIntoView; stub it so the mount effect doesn't crash.
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

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
    render(<CalendarStrip days={days} selectedDate={null} onDaySelect={() => {}} />);
    expect(screen.getByText('22')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
  });

  it('expands a day on click to show plant names', async () => {
    const user = userEvent.setup();
    render(<CalendarStrip days={days} selectedDate={null} onDaySelect={() => {}} />);
    await user.click(screen.getByText('24'));
    expect(screen.getByText(/Pothos/)).toBeInTheDocument();
    expect(screen.getByText(/Snake/)).toBeInTheDocument();
  });

  it('calls onDaySelect when a day card is clicked', async () => {
    const user = userEvent.setup();
    const onDaySelect = vi.fn();
    render(<CalendarStrip days={days} selectedDate={null} onDaySelect={onDaySelect} />);
    await user.click(screen.getByText('24'));
    expect(onDaySelect).toHaveBeenCalledWith('2026-04-24');
  });

  it('clears selection when clicking selected day again', async () => {
    const user = userEvent.setup();
    const onDaySelect = vi.fn();
    render(<CalendarStrip days={days} selectedDate="2026-04-24" onDaySelect={onDaySelect} />);
    await user.click(screen.getByText('24'));
    expect(onDaySelect).toHaveBeenCalledWith(null);
  });

  it('visually indicates selected day with distinct treatment from today', () => {
    const { container } = render(
      <CalendarStrip days={days} selectedDate="2026-04-24" onDaySelect={() => {}} />,
    );
    const dayButtons = container.querySelectorAll('button');
    const todayButton = dayButtons[0]; // 2026-04-22, is_today: true
    const selectedButton = dayButtons[2]; // 2026-04-24, selected (not today)
    // Today: filled green background
    expect(todayButton).toHaveStyle('background: var(--accent)');
    // Selected (not today): muted background
    expect(selectedButton).toHaveStyle('background: var(--accent-muted, rgba(0, 168, 107, 0.15))');
  });

  it('renders today-only treatment when selected day equals today', () => {
    const { container } = render(
      <CalendarStrip days={days} selectedDate="2026-04-22" onDaySelect={() => {}} />,
    );
    const dayButtons = container.querySelectorAll('button');
    const todayButton = dayButtons[0];
    expect(todayButton).toHaveStyle('background: var(--accent)');
  });

  it('scrolls today into center on mount', () => {
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    render(<CalendarStrip days={days} selectedDate={null} onDaySelect={() => {}} />);
    expect(scrollIntoViewMock).toHaveBeenCalledWith(
      expect.objectContaining({ inline: 'center' }),
    );
  });

  it('today gets white text when filled', () => {
    const { container } = render(
      <CalendarStrip days={days} selectedDate="2026-04-24" onDaySelect={() => {}} />,
    );
    const dayButtons = container.querySelectorAll('button');
    const todayButton = dayButtons[0];
    expect(todayButton).toHaveStyle('color: rgb(255, 255, 255)');
  });

  it('dims empty-day cards', () => {
    const { container } = render(
      <CalendarStrip days={days} selectedDate={null} onDaySelect={() => {}} />,
    );
    const dayButtons = container.querySelectorAll('button');
    const emptyDayButton = dayButtons[1]; // 2026-04-23 has count=0
    expect(emptyDayButton).toHaveStyle('opacity: 0.6');
  });
});
