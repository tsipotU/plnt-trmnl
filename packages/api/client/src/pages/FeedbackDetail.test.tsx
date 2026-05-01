import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { FeedbackDetail } from './FeedbackDetail';

interface FeedbackResponse {
  id: number;
  title: string;
  description: string | null;
  category: 'bug' | 'feature' | 'improvement' | 'other';
  status: 'open' | 'in_progress' | 'done' | 'wont_fix';
  page_path: string | null;
  created_at: string;
  updated_at: string | null;
  comments: { id: number; feedback_id: number; body: string; created_at: string; updated_at: string | null }[];
  images: { id: number; filename: string; url: string; created_at: string }[];
}

const baseFeedback: FeedbackResponse = {
  id: 7,
  title: 'Calibration modal flickers on submit',
  description: 'Tapping "Soil felt damp" makes the modal vanish then reappear.',
  category: 'bug',
  status: 'open',
  page_path: '/plants/3',
  created_at: '2026-04-29T12:00:00Z',
  updated_at: null,
  comments: [
    {
      id: 1,
      feedback_id: 7,
      body: 'Reproduced on iOS Safari.',
      created_at: '2026-04-29T13:00:00Z',
      updated_at: null,
    },
  ],
  images: [],
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/feedback" element={<div>list page</div>} />
        <Route path="/feedback/:id" element={<FeedbackDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('FeedbackDetail — render', () => {
  it('renders the title, category eyebrow, description, and a comment', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => baseFeedback,
    } as Response);
    renderAt('/feedback/7');
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /Calibration modal flickers/i }),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Tapping "Soil felt damp"/i)).toBeInTheDocument();
    expect(screen.getByText(/Reproduced on iOS Safari/i)).toBeInTheDocument();
    expect(screen.getByText(/Comments · 1/i)).toBeInTheDocument();
  });

  it('renders the not-found state on 404', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);
    renderAt('/feedback/999');
    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });
});

describe('FeedbackDetail — status change', () => {
  it('PATCHes status when a different status chip is tapped', async () => {
    let putBody: unknown = null;
    global.fetch = vi.fn().mockImplementation(async (url: RequestInfo, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : url.toString();
      const method = init?.method ?? 'GET';
      if (u === '/api/feedback/7' && method === 'GET') {
        return { ok: true, json: async () => baseFeedback } as Response;
      }
      if (u === '/api/feedback/7' && method === 'PUT') {
        putBody = JSON.parse(String(init?.body ?? '{}'));
        return { ok: true, json: async () => ({}) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    const user = userEvent.setup();
    renderAt('/feedback/7');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Done$/i, pressed: false })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^Done$/i }));

    await waitFor(() => {
      expect(putBody).toEqual({ status: 'done' });
    });
  });
});

describe('FeedbackDetail — add comment', () => {
  it('POSTs a comment and refetches', async () => {
    let postBody: unknown = null;
    global.fetch = vi.fn().mockImplementation(async (url: RequestInfo, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : url.toString();
      const method = init?.method ?? 'GET';
      if (u === '/api/feedback/7' && method === 'GET') {
        return { ok: true, json: async () => baseFeedback } as Response;
      }
      if (u === '/api/feedback/7/comments' && method === 'POST') {
        postBody = JSON.parse(String(init?.body ?? '{}'));
        return { ok: true, json: async () => ({}) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    const user = userEvent.setup();
    renderAt('/feedback/7');
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Calibration modal flickers/i })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/Add a comment/i), 'Confirmed.');
    await user.click(screen.getByRole('button', { name: /Post comment/i }));

    await waitFor(() => {
      expect(postBody).toEqual({ body: 'Confirmed.' });
    });
  });
});

describe('FeedbackDetail — edit sheet', () => {
  it('opens the edit sheet, edits the title, and PUTs the change', async () => {
    let putBody: unknown = null;
    global.fetch = vi.fn().mockImplementation(async (url: RequestInfo, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : url.toString();
      const method = init?.method ?? 'GET';
      if (u === '/api/feedback/7' && method === 'GET') {
        return { ok: true, json: async () => baseFeedback } as Response;
      }
      if (u === '/api/feedback/7' && method === 'PUT') {
        putBody = JSON.parse(String(init?.body ?? '{}'));
        return { ok: true, json: async () => ({}) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    const user = userEvent.setup();
    renderAt('/feedback/7');
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /Calibration modal flickers/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Edit details/i }));

    const titleInput = await screen.findByLabelText(/Title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'New title');
    await user.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(putBody).toMatchObject({ title: 'New title' });
    });
  });
});
