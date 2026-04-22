import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

type Category = 'bug' | 'feature' | 'improvement' | 'other';
type Status = 'open' | 'in_progress' | 'done' | 'wont_fix';

interface Comment {
  id: number;
  feedback_id: number;
  body: string;
  created_at: string;
  updated_at: string | null;
}

interface Feedback {
  id: number;
  title: string;
  description: string | null;
  category: Category;
  status: Status;
  page_path: string | null;
  created_at: string;
  updated_at: string | null;
  comments: Comment[];
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

export function FeedbackDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<Category>('improvement');

  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/feedback/${id}`);
      if (!res.ok) throw new Error(res.status === 404 ? 'Not found' : 'Failed to load');
      const data = (await res.json()) as Feedback;
      setItem(data);
      setEditTitle(data.title);
      setEditDescription(data.description ?? '');
      setEditCategory(data.category);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateFeedback(patch: Partial<Pick<Feedback, 'title' | 'description' | 'category' | 'status'>>) {
    if (!item) return;
    const res = await fetch(`/api/feedback/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Update failed');
      return;
    }
    await load();
  }

  async function handleStatusChange(next: Status) {
    await updateFeedback({ status: next });
  }

  async function handleSaveEdit() {
    if (!editTitle.trim()) {
      setError('Title is required');
      return;
    }
    await updateFeedback({
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      category: editCategory,
    });
    setEditing(false);
  }

  async function handleDelete() {
    if (!item) return;
    if (!confirm('Delete this feedback and all its comments?')) return;
    const res = await fetch(`/api/feedback/${item.id}`, { method: 'DELETE' });
    if (res.ok) {
      navigate('/feedback');
    } else {
      setError('Delete failed');
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!item || !newComment.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/feedback/${item.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newComment.trim() }),
      });
      if (!res.ok) {
        setError('Failed to post comment');
        return;
      }
      setNewComment('');
      await load();
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
        Loading…
      </div>
    );
  }

  if (error && !item) {
    return (
      <div>
        <BackLink />
        <div className="card" style={{ color: 'var(--danger)', textAlign: 'center' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div>
      <BackLink />

      {error && (
        <div
          className="card"
          role="alert"
          style={{ color: 'var(--danger)', marginBottom: 12 }}
        >
          {error}
        </div>
      )}

      {/* Header: title, category, status */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
          padding: 16,
          marginBottom: 16,
        }}
      >
        {editing ? (
          <>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={200}
              style={{ marginBottom: 12 }}
            />
            <label style={labelStyle}>Category</label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as Category)}
              style={{ marginBottom: 12 }}
            >
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <label style={labelStyle}>Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              style={textareaStyle}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={handleSaveEdit} style={{ flex: 1 }}>
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditTitle(item.title);
                  setEditDescription(item.description ?? '');
                  setEditCategory(item.category);
                  setError(null);
                }}
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
                flexWrap: 'wrap',
              }}
            >
              <Badge color={CATEGORY_COLORS[item.category]}>
                {CATEGORY_LABELS[item.category]}
              </Badge>
              <span style={{ marginLeft: 'auto' }}>
                <label
                  htmlFor="status-select"
                  style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 6 }}
                >
                  Status
                </label>
                <select
                  id="status-select"
                  value={item.status}
                  onChange={(e) => handleStatusChange(e.target.value as Status)}
                  style={{ width: 'auto', display: 'inline-block', padding: '6px 10px' }}
                >
                  {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
              {item.title}
            </h1>
            {item.description && (
              <p
                style={{
                  fontSize: 15,
                  color: 'var(--text-primary)',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {item.description}
              </p>
            )}
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                marginTop: 12,
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span>Created {formatDateTime(item.created_at)}</span>
              {item.page_path && (
                <span>
                  on <code>{item.page_path}</code>
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                onClick={() => setEditing(true)}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  padding: '8px 14px',
                }}
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                style={{
                  background: 'transparent',
                  color: 'var(--danger)',
                  border: '1px solid var(--danger)',
                  fontSize: 14,
                  padding: '8px 14px',
                  marginLeft: 'auto',
                }}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {/* Comments */}
      <h2
        style={{
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 10,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        Comments ({item.comments.length})
      </h2>

      <div style={{ marginBottom: 16 }}>
        {item.comments.map((c) => (
          <CommentCard key={c.id} comment={c} onChange={load} onError={setError} />
        ))}
      </div>

      {/* Add comment */}
      <form onSubmit={handleAddComment}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          placeholder="Add a comment…"
          style={textareaStyle}
        />
        <button
          type="submit"
          disabled={posting || !newComment.trim()}
          style={{
            marginTop: 10,
            width: '100%',
            fontSize: 15,
            fontWeight: 600,
            padding: '12px 20px',
            opacity: posting || !newComment.trim() ? 0.6 : 1,
          }}
        >
          {posting ? 'Posting…' : 'Post comment'}
        </button>
      </form>

      <div style={{ height: 80 }} />
    </div>
  );
}

function CommentCard({
  comment,
  onChange,
  onError,
}: {
  comment: Comment;
  onChange: () => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!body.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/feedback/comments/${comment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (!res.ok) {
        onError('Failed to update comment');
        return;
      }
      setEditing(false);
      await onChange();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this comment?')) return;
    const res = await fetch(`/api/feedback/comments/${comment.id}`, { method: 'DELETE' });
    if (res.ok) {
      await onChange();
    } else {
      onError('Failed to delete comment');
    }
  }

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius)',
        padding: 12,
        marginBottom: 8,
      }}
    >
      {editing ? (
        <>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            style={textareaStyle}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={handleSave}
              disabled={saving || !body.trim()}
              style={{
                fontSize: 14,
                padding: '8px 14px',
                opacity: saving || !body.trim() ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setBody(comment.body);
              }}
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: 14,
                padding: '8px 14px',
              }}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              marginBottom: 6,
            }}
          >
            {comment.body}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            <span>{formatDateTime(comment.created_at)}</span>
            {comment.updated_at && comment.updated_at !== comment.created_at && (
              <span style={{ opacity: 0.7 }}>edited</span>
            )}
            <button
              onClick={() => setEditing(true)}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: 12,
                padding: '4px 8px',
                minHeight: 0,
              }}
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              style={{
                background: 'transparent',
                color: 'var(--danger)',
                fontSize: 12,
                padding: '4px 8px',
                minHeight: 0,
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/feedback"
      style={{
        display: 'inline-block',
        marginBottom: 12,
        fontSize: 14,
        color: 'var(--text-secondary)',
      }}
    >
      ← All feedback
    </Link>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 10,
        background: color,
        color: 'white',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
      }}
    >
      {children}
    </span>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: 'var(--text-secondary)',
  marginBottom: 6,
};

const textareaStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  padding: 12,
  borderRadius: 'var(--radius)',
  fontSize: 15,
  width: '100%',
  fontFamily: 'inherit',
  resize: 'vertical',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
