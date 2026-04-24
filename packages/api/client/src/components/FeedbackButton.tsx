import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDialogContext } from '../context/DialogContext';

type Category = 'bug' | 'feature' | 'improvement' | 'other';

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'improvement', label: 'Improvement' },
  { value: 'feature', label: 'Feature' },
  { value: 'bug', label: 'Bug' },
  { value: 'other', label: 'Other' },
];

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const previews = useMemo(
    () => images.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [images],
  );
  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  function handlePickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow re-picking same file later
    if (picked.length === 0) return;

    const next = [...images];
    for (const f of picked) {
      if (!f.type.startsWith('image/')) {
        setError('Only image files are supported');
        continue;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        setError('Image too large — max 5MB');
        continue;
      }
      if (next.length >= MAX_IMAGES) {
        setError(`At most ${MAX_IMAGES} images`);
        break;
      }
      next.push(f);
    }
    setImages(next);
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

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
      const form = new FormData();
      form.append('title', title.trim());
      if (description.trim()) form.append('description', description.trim());
      form.append('category', category);
      form.append('pagePath', location.pathname);
      for (const img of images) {
        form.append('images', img, img.name);
      }
      const res = await fetch('/api/feedback', {
        method: 'POST',
        body: form,
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

            <label
              style={{
                display: 'block',
                fontSize: 13,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              Images <span style={{ opacity: 0.6 }}>(optional, up to {MAX_IMAGES}, max 5MB each)</span>
            </label>
            <div style={{ marginBottom: 14 }}>
              {previews.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  {previews.map((p, i) => (
                    <div
                      key={p.url}
                      style={{
                        position: 'relative',
                        aspectRatio: '1 / 1',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius)',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={p.url}
                        alt={`Attachment ${i + 1} preview`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        aria-label={`Remove image ${i + 1}`}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 24,
                          height: 24,
                          minWidth: 0,
                          minHeight: 0,
                          padding: 0,
                          borderRadius: '50%',
                          background: 'rgba(0, 0, 0, 0.65)',
                          color: 'white',
                          fontSize: 14,
                          lineHeight: '24px',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {images.length < MAX_IMAGES && (
                <label
                  style={{
                    display: 'inline-block',
                    fontSize: 14,
                    color: 'var(--accent)',
                    background: 'var(--bg-secondary)',
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '10px 14px',
                    cursor: 'pointer',
                  }}
                >
                  {images.length === 0 ? '📷 Attach image' : '+ Add another'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePickImages}
                    style={{ display: 'none' }}
                    data-testid="feedback-image-input"
                  />
                </label>
              )}
            </div>

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
