import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDialogContext } from '../context/DialogContext';
import { FAB } from './molecules/FAB/FAB';
import { Sheet } from './molecules/Sheet/Sheet';
import { FormStep } from './molecules/FormStep/FormStep';
import { Chip } from './atoms/Chip/Chip';
import { Button } from './atoms/Button/Button';
import { FieldLabel } from './atoms/FieldLabel/FieldLabel';
import { Pictogram } from './atoms/Pictogram/Pictogram';
import './FeedbackButton.css';

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

  if (isArchiveDialogOpen) return null;

  return (
    <>
      <FAB
        label="Send feedback"
        icon={<Pictogram name="balloon" size={22} />}
        position="static"
        onClick={() => setOpen(true)}
        className="p7l-feedback-fab"
      />
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
    e.target.value = '';
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
  }, []);

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
    <Sheet
      open
      onClose={onClose}
      title="Send feedback"
      footer={
        sent ? null : (
          <>
            <Button variant="ghost" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              type="submit"
              form="feedback-form"
              disabled={submitting}
              loading={submitting}
              style={{ marginLeft: 'auto' }}
            >
              Send feedback
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <div className="p7l-feedback-sent" role="status">
          Thanks — feedback saved
        </div>
      ) : (
        <form id="feedback-form" onSubmit={handleSubmit} className="p7l-feedback-form">
          <FormStep num="01 · Type" title="What kind of feedback?">
            <div className="p7l-feedback-form__chips" role="radiogroup" aria-label="Category">
              {CATEGORY_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  toggleable
                  active={category === opt.value}
                  onClick={() => setCategory(opt.value)}
                >
                  {opt.label}
                </Chip>
              ))}
            </div>
          </FormStep>

          <FormStep num="02 · Headline" title="One-line summary">
            <FieldLabel htmlFor="feedback-title" required>
              Title
            </FieldLabel>
            <input
              ref={titleRef}
              id="feedback-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's up?"
              maxLength={200}
              className="p7l-feedback-form__input"
            />
          </FormStep>

          <FormStep num="03 · Details" title="Optional context">
            <FieldLabel htmlFor="feedback-desc" hint="Repro steps, ideas, anything else.">
              Description
            </FieldLabel>
            <textarea
              id="feedback-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="p7l-feedback-form__textarea"
            />
          </FormStep>

          <FormStep
            num="04 · Images"
            title={`Attachments · up to ${MAX_IMAGES} · 5MB each`}
          >
            <div className="p7l-feedback-form__images">
              {previews.length > 0 && (
                <div className="p7l-feedback-form__previews">
                  {previews.map((p, i) => (
                    <div key={p.url} className="p7l-feedback-form__preview">
                      <img src={p.url} alt={`Attachment ${i + 1} preview`} />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        aria-label={`Remove image ${i + 1}`}
                        className="p7l-feedback-form__preview-remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {images.length < MAX_IMAGES && (
                <label className="p7l-feedback-form__attach">
                  {images.length === 0 ? 'Attach image' : '+ Add another'}
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
          </FormStep>

          <div className="p7l-feedback-form__on-page">
            On page <code>{location.pathname}</code>
          </div>

          {error && (
            <div role="alert" className="p7l-feedback-form__error">
              {error}
            </div>
          )}
        </form>
      )}
    </Sheet>
  );
}
