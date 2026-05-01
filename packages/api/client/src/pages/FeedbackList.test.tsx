import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FeedbackList } from './FeedbackList';

beforeEach(() => {
  vi.restoreAllMocks();
});

interface FeedbackItem {
  id: number;
  title: string;
  description: string | null;
  category: 'bug' | 'feature' | 'improvement' | 'other';
  status: 'open' | 'in_progress' | 'done' | 'wont_fix';
  page_path: string | null;
  created_at: string;
  updated_at: string;
  comment_count: number;
}

const sample = (overrides: Partial<FeedbackItem> = {}): FeedbackItem => ({
  id: 1,
  title: 'Calibration modal flickers on submit',
  description: 'Tapping "Soil felt damp" makes the modal vanish then reappear.',
  category: 'bug',
  status: 'open',
  page_path: '/plants/3',
  created_at: '2026-04-29T12:00:00Z',
  updated_at: '2026-04-29T12:00:00Z',
  comment_count: 0,
  ...overrides,
});

function mockFeedback(items: FeedbackItem[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (url.startsWith('/api/feedback')) {
        // Apply category/status filters from query string for the test fake.
        const u = new URL(url, 'http://localhost');
        const cat = u.searchParams.get('category');
        const st = u.searchParams.get('status');
        const filtered = items.filter(
          (i) => (!cat || i.category === cat) && (!st || i.status === st),
        );
        return Promise.resolve({ ok: true, json: async () => filtered });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }),
  );
}

describe('FeedbackList — empty', () => {
  it('shows the empty-state message when no feedback exists', async () => {
    mockFeedback([]);
    render(
      <MemoryRouter>
        <FeedbackList />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/No feedback matches these filters/i)).toBeInTheDocument();
    });
  });
});

describe('FeedbackList — populated', () => {
  it('renders the page title, count, and a row per item', async () => {
    mockFeedback([
      sample(),
      sample({ id: 2, title: 'Group watering by room', category: 'feature' }),
    ]);
    render(
      <MemoryRouter>
        <FeedbackList />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^Feedback$/ })).toBeInTheDocument();
    });
    expect(screen.getByText(/2 entries/i)).toBeInTheDocument();
    expect(screen.getByText('Calibration modal flickers on submit')).toBeInTheDocument();
    expect(screen.getByText('Group watering by room')).toBeInTheDocument();
  });

  it('filters by category when a category chip is tapped', async () => {
    const user = userEvent.setup();
    mockFeedback([
      sample({ id: 1, title: 'Bug item', category: 'bug' }),
      sample({ id: 2, title: 'Feature item', category: 'feature' }),
      sample({ id: 3, title: 'Improvement item', category: 'improvement' }),
    ]);
    render(
      <MemoryRouter>
        <FeedbackList />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Bug item')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^Feature$/ }));

    await waitFor(() => {
      expect(screen.getByText('Feature item')).toBeInTheDocument();
    });
    expect(screen.queryByText('Bug item')).toBeNull();
    expect(screen.queryByText('Improvement item')).toBeNull();
  });

  it('filters by status when a status chip is tapped', async () => {
    const user = userEvent.setup();
    mockFeedback([
      sample({ id: 1, title: 'Open item', status: 'open' }),
      sample({ id: 2, title: 'Done item', status: 'done' }),
    ]);
    render(
      <MemoryRouter>
        <FeedbackList />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Open item')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^Done$/ }));

    await waitFor(() => {
      expect(screen.getByText('Done item')).toBeInTheDocument();
    });
    expect(screen.queryByText('Open item')).toBeNull();
  });

  it('renders 1 entry singular for a single item', async () => {
    mockFeedback([sample()]);
    render(
      <MemoryRouter>
        <FeedbackList />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/1 entry/i)).toBeInTheDocument();
    });
  });
});
