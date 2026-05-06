import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackBar } from '../components/molecules/BackBar/BackBar';
import { PageHead } from '../components/molecules/PageHead/PageHead';
import { FilterRail } from '../components/molecules/FilterRail/FilterRail';
import { FeedbackRow, type FeedbackTone } from '../components/molecules/FeedbackRow/FeedbackRow';
import { EmptyState } from '../components/molecules/EmptyState/EmptyState';
import { Chip } from '../components/atoms/Chip/Chip';
import './FeedbackList.css';

type Category = 'bug' | 'feature' | 'improvement' | 'other';
type Status = 'open' | 'in_progress' | 'done' | 'wont_fix';

interface FeedbackItem {
  id: number;
  title: string;
  description: string | null;
  category: Category;
  status: Status;
  page_path: string | null;
  created_at: string;
  updated_at: string;
  comment_count: number;
}

const CATEGORY_LABELS: Record<Category, string> = {
  bug: 'Bug',
  feature: 'Feature',
  improvement: 'Improvement',
  other: 'Other',
};

const STATUS_LABELS: Record<Status, string> = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
  wont_fix: "Won't fix",
};

const CATEGORY_TONES: Record<Category, FeedbackTone> = {
  bug: 'bug',
  feature: 'idea',
  improvement: 'idea',
  other: 'neutral',
};

const CATEGORIES: Category[] = ['bug', 'feature', 'improvement', 'other'];
const STATUSES: Status[] = ['open', 'in_progress', 'done', 'wont_fix'];

export function FeedbackList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<Category | null>(null);
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (categoryFilter) params.set('category', categoryFilter);
    if (statusFilter) params.set('status', statusFilter);
    const qs = params.toString();
    setLoading(true);
    setError(null);
    fetch(`/api/feedback${qs ? `?${qs}` : ''}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load feedback');
        return r.json();
      })
      .then((data: FeedbackItem[]) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [categoryFilter, statusFilter]);

  const total = useMemo(() => items.length, [items]);

  return (
    <div className="p7l-feedbacklist">
      <BackBar onBack={() => navigate('/')} backLabel="← Today" />
      <PageHead
        eyebrow={total === 0 ? 'No entries' : `${total} ${total === 1 ? 'entry' : 'entries'}`}
        title="Feedback"
      />

      <FilterRail bordered={false} aria-label="Filter by type">
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            toggleable
            active={categoryFilter === c}
            onClick={() => setCategoryFilter(categoryFilter === c ? null : c)}
          >
            {CATEGORY_LABELS[c]}
          </Chip>
        ))}
      </FilterRail>
      <FilterRail compact aria-label="Filter by status">
        {STATUSES.map((s) => (
          <Chip
            key={s}
            toggleable
            active={statusFilter === s}
            onClick={() => setStatusFilter(statusFilter === s ? null : s)}
          >
            {STATUS_LABELS[s]}
          </Chip>
        ))}
      </FilterRail>

      {loading && (
        <EmptyState>Loading…</EmptyState>
      )}

      {error && !loading && (
        <EmptyState>{error}</EmptyState>
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState>
          No feedback matches these filters yet — tap the floating button to add some.
        </EmptyState>
      )}

      {!loading && !error && items.length > 0 && (
        <div role="list">
          {items.map((item) => (
            <FeedbackRow
              key={item.id}
              role="listitem"
              tone={CATEGORY_TONES[item.category]}
              typeLabel={CATEGORY_LABELS[item.category]}
              status={STATUS_LABELS[item.status]}
              date={formatDate(item.created_at)}
              title={item.title}
              snippet={
                item.description
                  ? truncate(item.description, 140)
                  : item.comment_count > 0
                    ? `${item.comment_count} ${item.comment_count === 1 ? 'comment' : 'comments'}`
                    : undefined
              }
              onClick={() => navigate(`/feedback/${item.id}`)}
            />
          ))}
        </div>
      )}

      {/* Bottom padding so the global feedback FAB doesn't cover the last row */}
      <div style={{ height: 120 }} />
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + '…';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
