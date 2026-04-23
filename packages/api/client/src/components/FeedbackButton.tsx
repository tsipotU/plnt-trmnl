import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDialogContext } from '../context/DialogContext';

type Category = 'bug' | 'feature' | 'improvement' | 'other';

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'improvement', label: 'Improvement' },
  { value: 'feature', label: 'Feature' },
  { value: 'bug', label: 'Bug' },
  { value: 'other', label: 'Other' },
];

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const { isArchiveDialogOpen } = useDialogContext();

  // Hide the FAB while the archive dialog is open
  if (isArchiveDialogOpen) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 88,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: 'white',
          fontSize: 22,
          padding: 0,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          zIndex: 90,
        }}
      >
        💬
      </button>
      {open && <FeedbackSheet onClose={() => setOpen(false)} />}
    </>
  );
}

function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const location = useLocation();
  const titleRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<Category>('improvement');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    titleRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          category,
          pagePath: location.pathname,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Request failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      setSent(true);
      setTimeout(onClose, 900);
    } catch {
      setError('Network error — try again');
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Send feedback"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-primary)',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          width: '100%',
          maxWidth: 430,
          maxHeight: '85dvh',
          overflowY: 'auto',
          padding: '20px 16px 24px',
          borderTop: '1px solid var(--border)',
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 40,
            height: 4,
            background: 'var(--border)',
            borderRadius: 2,
            margin: '0 auto 16px',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Send feedback</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 20,
              padding: 8,
              minWidth: 0,
              minHeight: 0,
            }}
          >
            ✕
          </button>
        </div>

        {sent ? (
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius)',
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--accent)',
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            Thanks — feedback saved
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              style={{ marginBottom: 14 }}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <label
              style={{
                display: 'block',
                fontSize: 13,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              Title
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's up?"
              maxLength={200}
              style={{ marginBottom: 14 }}
            />

            <label
              style={{
                display: 'block',
                fontSize: 13,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              Description <span style={{ opacity: 0.6 }}>(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="More context, repro steps, ideas…"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                padding: 12,
                borderRadius: 'var(--radius)',
                fontSize: 16,
                width: '100%',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: 14,
              }}
            />

            <div
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                marginBottom: 16,
                wordBreak: 'break-all',
              }}
            >
              On page: <code>{location.pathname}</code>
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  color: 'var(--danger)',
                  fontSize: 14,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                fontSize: 16,
                fontWeight: 700,
                padding: '14px 24px',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Sending…' : 'Send feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
