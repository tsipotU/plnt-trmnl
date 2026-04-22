import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type Category = 'bug' | 'feature' | 'improvement' | 'other';
type Status = 'open' | 'in_progress' | 'done' | 'wont_fix';

interface FeedbackRow {
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
  improvement: 'Improvement',
  feature: 'Feature',
  bug: 'Bug',
  other: 'Other',
};

const STATUS_LABELS: Record<Status, string> = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
  wont_fix: "Won't fix",
};

const CATEGORY_COLORS: Record<Category, string> = {
  bug: 'var(--danger)',
  feature: 'var(--accent)',
  improvement: 'var(--warning)',
  other: 'var(--text-secondary)',
};

const STATUS_COLORS: Record<Status, string> = {
  open: 'var(--accent)',
  in_progress: 'var(--warning)',
  done: 'var(--text-secondary)',
  wont_fix: 'var(--text-secondary)',
};

export function FeedbackList() {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('');
  const [statusFilter, setStatusFilter] = useState<Status | ''>('');

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
      .then((data: FeedbackRow[]) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [categoryFilter, statusFilter]);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Feedback</h1>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as Category | '')}
          aria-label="Filter by category"
          style={{ flex: 1 }}
        >
          <option value="">All categories</option>
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | '')}
          aria-label="Filter by status"
          style={{ flex: 1 }}
        >
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            color: 'var(--text-secondary)',
          }}
        >
          Loading…
        </div>
      )}

      {error && !loading && (
        <div
          className="card"
          style={{ color: 'var(--danger)', textAlign: 'center' }}
        >
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 16px',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
          <p>No feedback yet.</p>
          <p style={{ fontSize: 14, marginTop: 4 }}>
            Tap the button in the corner to add some.
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div>
          {items.map((item) => (
            <FeedbackRowCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Bottom padding so the FAB doesn't cover the last card */}
      <div style={{ height: 80 }} />
    </div>
  );
}

function FeedbackRowCard({ item }: { item: FeedbackRow }) {
  return (
    <Link
      to={`/feedback/${item.id}`}
      style={{
        display: 'block',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius)',
        padding: 14,
        marginBottom: 10,
        color: 'var(--text-primary)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <Badge color={CATEGORY_COLORS[item.category]}>
          {CATEGORY_LABELS[item.category]}
        </Badge>
        <Badge color={STATUS_COLORS[item.status]} variant="outline">
          {STATUS_LABELS[item.status]}
        </Badge>
        {item.comment_count > 0 && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            💬 {item.comment_count}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 4,
          lineHeight: 1.3,
        }}
      >
        {item.title}
      </div>
      {item.description && (
        <div
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.description}
        </div>
      )}
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          marginTop: 8,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <span>{formatDate(item.created_at)}</span>
        {item.page_path && (
          <span style={{ opacity: 0.8 }}>
            on <code>{item.page_path}</code>
          </span>
        )}
      </div>
    </Link>
  );
}

function Badge({
  children,
  color,
  variant = 'solid',
}: {
  children: React.ReactNode;
  color: string;
  variant?: 'solid' | 'outline';
}) {
  const isOutline = variant === 'outline';
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 10,
        background: isOutline ? 'transparent' : color,
        color: isOutline ? color : 'white',
        border: isOutline ? `1px solid ${color}` : 'none',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
      }}
    >
      {children}
    </span>
  );
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
