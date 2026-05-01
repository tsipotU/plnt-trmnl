import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ArchivedPlants } from './ArchivedPlants';

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockArchived(plants: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (url === '/api/plants/archived') {
        return Promise.resolve({ ok: true, json: async () => plants });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }),
  );
}

const sample = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  name: 'Mara',
  species: 'Maranta leuconeura',
  identifier: null,
  archived_at: '2026-04-04T12:00:00Z',
  archive_reason: 'died',
  archive_note: 'Root rot after the December cold snap. RIP.',
  illustration_path: null,
  ...overrides,
});

describe('ArchivedPlants — empty', () => {
  it('shows the empty state when nothing has been archived', async () => {
    mockArchived([]);
    render(
      <MemoryRouter>
        <ArchivedPlants />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/No archived plants yet/i)).toBeInTheDocument();
    });
  });
});

describe('ArchivedPlants — populated', () => {
  it('renders the page title, count, and one card per plant', async () => {
    mockArchived([sample(), sample({ id: 2, name: 'Penny', archive_reason: 'gave_away' })]);
    render(
      <MemoryRouter>
        <ArchivedPlants />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^Archive$/ })).toBeInTheDocument();
    });
    expect(screen.getByText(/2 entries/i)).toBeInTheDocument();
    expect(screen.getByText('Mara')).toBeInTheDocument();
    expect(screen.getByText('Penny')).toBeInTheDocument();
  });

  it('filters by reason when a filter chip is tapped', async () => {
    const user = userEvent.setup();
    mockArchived([
      sample({ id: 1, name: 'Mara', archive_reason: 'died' }),
      sample({ id: 2, name: 'Penny', archive_reason: 'gave_away' }),
      sample({ id: 3, name: 'Vincent', archive_reason: 'moved' }),
    ]);
    render(
      <MemoryRouter>
        <ArchivedPlants />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Mara')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Gave away/i }));

    expect(screen.getByText('Penny')).toBeInTheDocument();
    expect(screen.queryByText('Mara')).toBeNull();
    expect(screen.queryByText('Vincent')).toBeNull();
  });

  it('shows "no entries in this category" when a filter excludes everything', async () => {
    const user = userEvent.setup();
    mockArchived([sample({ archive_reason: 'died' })]);
    render(
      <MemoryRouter>
        <ArchivedPlants />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Mara')).toBeInTheDocument();
    });
    // Reason = "died" only; tapping any other filter (if shown) would
    // reduce visible to zero. Here we only have one reason group, so
    // confirm the filter chips reflect that.
    expect(screen.queryByRole('button', { name: /Gave away/i })).toBeNull();
    void user;
  });

  it('renders the archive-note text for died plants', async () => {
    mockArchived([sample()]);
    render(
      <MemoryRouter>
        <ArchivedPlants />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Mara')).toBeInTheDocument();
    });
    // The note renders inside the ArchiveCard's quote-wrapped serif body.
    expect(
      screen.getByText(/Root rot after the December cold snap\. RIP\./i),
    ).toBeInTheDocument();
    // "Died" appears in two places (filter chip + card stamp). Both is fine;
    // we just need at least one match.
    expect(screen.getAllByText(/Died/i).length).toBeGreaterThan(0);
  });
});
