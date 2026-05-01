import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackBar } from '../components/molecules/BackBar/BackBar';
import { PageHead } from '../components/molecules/PageHead/PageHead';
import { SectionHead } from '../components/molecules/SectionHead/SectionHead';
import { FilterRail } from '../components/molecules/FilterRail/FilterRail';
import { Sheet } from '../components/molecules/Sheet/Sheet';
import { FormStep } from '../components/molecules/FormStep/FormStep';
import { EmptyState } from '../components/molecules/EmptyState/EmptyState';
import { Chip } from '../components/atoms/Chip/Chip';
import { Button } from '../components/atoms/Button/Button';
import { FieldLabel } from '../components/atoms/FieldLabel/FieldLabel';
import './FeedbackDetail.css';

type Category = 'bug' | 'feature' | 'improvement' | 'other';
type Status = 'open' | 'in_progress' | 'done' | 'wont_fix';

interface Comment {
  id: number;
  feedback_id: number;
  body: string;
  created_at: string;
  updated_at: string | null;
}

interface FeedbackImage {
  id: number;
  filename: string;
  url: string;
  created_at: string;
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
  images: FeedbackImage[];
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

const CATEGORIES: Category[] = ['bug', 'feature', 'improvement', 'other'];
const STATUSES: Status[] = ['open', 'in_progress', 'done', 'wont_fix'];

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

  const [enlargedImage, setEnlargedImage] = useState<FeedbackImage | null>(null);

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

  async function patchFeedback(patch: Partial<Pick<Feedback, 'title' | 'description' | 'category' | 'status'>>) {
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
    if (!item || item.status === next) return;
    await patchFeedback({ status: next });
  }

  async function handleSaveEdit() {
    if (!editTitle.trim()) {
      setError('Title is required');
      return;
    }
    await patchFeedback({
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      category: editCategory,
    });
    setEditing(false);
  }

  function handleCancelEdit() {
    if (!item) return;
    setEditing(false);
    setEditTitle(item.title);
    setEditDescription(item.description ?? '');
    setEditCategory(item.category);
    setError(null);
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
      <div className="p7l-feedbackdetail">
        <BackBar onBack={() => navigate('/feedback')} backLabel="← Feedback" />
        <EmptyState>Loading…</EmptyState>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="p7l-feedbackdetail">
        <BackBar onBack={() => navigate('/feedback')} backLabel="← Feedback" />
        <EmptyState>{error}</EmptyState>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="p7l-feedbackdetail">
      <BackBar
        onBack={() => navigate('/feedback')}
        backLabel="← Feedback"
        eyebrow={CATEGORY_LABELS[item.category]}
      />
      <PageHead
        size="sm"
        eyebrow={`Created ${formatDateTime(item.created_at)}`}
        title={item.title}
      />

      {error && (
        <div className="p7l-feedbackdetail__error" role="alert">
          {error}
        </div>
      )}

      {item.description && (
        <p className="p7l-feedbackdetail__body">{item.description}</p>
      )}

      {item.images && item.images.length > 0 && (
        <div className="p7l-feedbackdetail__images" data-testid="feedback-image-grid">
          {item.images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className="p7l-feedbackdetail__image"
              onClick={() => setEnlargedImage(img)}
              aria-label={`Enlarge image ${i + 1}`}
            >
              <img src={img.url} alt={`Attachment ${i + 1}`} />
            </button>
          ))}
        </div>
      )}

      {item.page_path && (
        <div className="p7l-feedbackdetail__on-page">
          On page <code>{item.page_path}</code>
        </div>
      )}

      <SectionHead as="h2" label="Status" />
      <FilterRail aria-label="Status">
        {STATUSES.map((s) => (
          <Chip
            key={s}
            toggleable
            active={item.status === s}
            onClick={() => handleStatusChange(s)}
          >
            {STATUS_LABELS[s]}
          </Chip>
        ))}
      </FilterRail>

      <div className="p7l-feedbackdetail__actions">
        <Button variant="ghost" onClick={() => setEditing(true)}>
          Edit details
        </Button>
        <Button variant="destructive" onClick={handleDelete} style={{ marginLeft: 'auto' }}>
          Delete
        </Button>
      </div>

      <SectionHead as="h2" label={`Comments · ${item.comments.length}`} />
      <div className="p7l-feedbackdetail__comments">
        {item.comments.map((c) => (
          <CommentCard key={c.id} comment={c} onChange={load} onError={setError} />
        ))}
      </div>

      <form className="p7l-feedbackdetail__form" onSubmit={handleAddComment}>
        <FieldLabel htmlFor="new-comment">Add a comment</FieldLabel>
        <textarea
          id="new-comment"
          className="p7l-feedbackdetail__textarea"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          placeholder="Add context, follow-up, a fix idea…"
        />
        <Button type="submit" disabled={posting || !newComment.trim()} fullWidth>
          {posting ? 'Posting…' : 'Post comment'}
        </Button>
      </form>

      <div style={{ height: 120 }} />

      <Sheet
        open={editing}
        onClose={handleCancelEdit}
        title="Edit feedback"
        footer={
          <>
            <Button variant="ghost" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} style={{ marginLeft: 'auto' }}>
              Save
            </Button>
          </>
        }
      >
        <div className="p7l-feedbackdetail__edit">
          <FormStep num="01 · Title" title="What's the headline?">
            <FieldLabel htmlFor="edit-title">Title</FieldLabel>
            <input
              id="edit-title"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={200}
            />
          </FormStep>
          <FormStep num="02 · Category" title="What kind of feedback?">
            <div className="p7l-feedbackdetail__edit-chips" role="radiogroup" aria-label="Category">
              {CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  toggleable
                  active={editCategory === c}
                  onClick={() => setEditCategory(c)}
                  aria-label={CATEGORY_LABELS[c]}
                >
                  {CATEGORY_LABELS[c]}
                </Chip>
              ))}
            </div>
          </FormStep>
          <FormStep num="03 · Details" title="More context (optional)">
            <FieldLabel htmlFor="edit-desc">Description</FieldLabel>
            <textarea
              id="edit-desc"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
            />
          </FormStep>
        </div>
      </Sheet>

      {enlargedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged image"
          className="p7l-feedbackdetail__lightbox"
          onClick={() => setEnlargedImage(null)}
        >
          <img src={enlargedImage.url} alt="Enlarged attachment" />
          <button
            type="button"
            className="p7l-feedbackdetail__lightbox-close"
            onClick={() => setEnlargedImage(null)}
            aria-label="Close image"
          >
            ✕
          </button>
        </div>
      )}
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

  if (editing) {
    return (
      <div className="p7l-feedbackdetail__comment">
        <textarea
          className="p7l-feedbackdetail__textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          aria-label="Edit comment"
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Button size="sm" onClick={handleSave} disabled={saving || !body.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(false);
              setBody(comment.body);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p7l-feedbackdetail__comment">
      <p className="p7l-feedbackdetail__comment-body">{comment.body}</p>
      <div className="p7l-feedbackdetail__comment-meta">
        <span>{formatDateTime(comment.created_at)}</span>
        {comment.updated_at && comment.updated_at !== comment.created_at && (
          <span style={{ opacity: 0.7 }}>edited</span>
        )}
        <button type="button" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button type="button" onClick={handleDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}

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
