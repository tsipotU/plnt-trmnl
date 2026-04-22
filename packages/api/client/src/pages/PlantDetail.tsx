import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

// --- Types ---

interface Plant {
  id: number;
  name: string;
  species: string | null;
  common_name: string | null;
  identifier: string | null;
  location: string | null;
  pot_size_cm: number | null;
  plant_size: string | null;
  light_level: string | null;
  current_interval: number | null;
  next_water_date: string | null;
  last_watered_at: string | null;
  illustration_path: string | null;
  notes: string | null;
  archived: number;
}

interface Condition {
  id: number;
  condition_name: string;
  symptoms: string | null;
  remedy: string | null;
  severity: 'info' | 'warning' | 'critical';
  is_active: number;
}

interface PlantEvent {
  id: number;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  created_at: string;
}

// --- Helpers ---

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function eventIcon(type: string): string {
  const icons: Record<string, string> = {
    watered: '💧',
    calibration: '📊',
    schedule_change: '📅',
    fertilized: '🌿',
    condition_detected: '⚠️',
    condition_resolved: '✅',
    enrichment_complete: '✨',
    enrichment_failed: '❌',
    overflow_rebalance: '🔄',
    archived: '📦',
    fact_disabled: '🚫',
    vacation_start: '✈️',
    vacation_end: '🏠',
  };
  return icons[type] ?? '📌';
}

function severityColor(severity: string): string {
  if (severity === 'critical') return 'var(--danger)';
  if (severity === 'warning') return 'var(--warning)';
  return 'var(--accent)';
}

// --- Inline editable field ---

interface EditableFieldProps {
  value: string;
  onSave: (val: string) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  style?: React.CSSProperties;
}

function EditableField({ value, onSave, type = 'text', placeholder, style }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function handleBlur() {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      setEditing(false);
      if (draft !== value) onSave(draft);
    }
    if (e.key === 'Escape') {
      setDraft(value);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{ ...style, width: '100%' }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      style={{
        cursor: 'text',
        borderBottom: '1px dashed var(--border)',
        paddingBottom: 2,
        minHeight: 24,
        display: 'inline-block',
        ...style,
      }}
      title="Tap to edit"
    >
      {value || <span style={{ color: 'var(--text-secondary)' }}>{placeholder ?? '—'}</span>}
    </span>
  );
}

// --- Editable Select ---

interface EditableSelectProps {
  value: string;
  options: { value: string; label: string }[];
  onSave: (val: string) => void;
  style?: React.CSSProperties;
}

function EditableSelect({ value, options, onSave, style }: EditableSelectProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <select
        value={value}
        autoFocus
        onChange={(e) => {
          onSave(e.target.value);
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
        style={{ ...style, width: '100%' }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  const label = options.find((o) => o.value === value)?.label ?? value ?? '—';
  return (
    <span
      onClick={() => setEditing(true)}
      style={{
        cursor: 'pointer',
        borderBottom: '1px dashed var(--border)',
        paddingBottom: 2,
        minHeight: 24,
        display: 'inline-block',
        ...style,
      }}
      title="Tap to edit"
    >
      {label}
    </span>
  );
}

// --- Toast ---

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--accent)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: 'var(--radius)',
        fontSize: 14,
        fontWeight: 600,
        zIndex: 200,
        maxWidth: '90vw',
        textAlign: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      {message}
    </div>
  );
}

function UndoToast({
  message,
  onUndo,
  onExpire,
}: {
  message: string;
  onUndo: () => void;
  onExpire: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onExpire, 15000);
    return () => clearTimeout(t);
  }, [onExpire]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--accent)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: 'var(--radius)',
        fontSize: 14,
        fontWeight: 600,
        zIndex: 200,
        maxWidth: '90vw',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      <span>{message}</span>
      <button
        onClick={onUndo}
        style={{
          background: 'transparent',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.6)',
          padding: '4px 10px',
          fontSize: 13,
          fontWeight: 700,
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Undo
      </button>
    </div>
  );
}

// --- Confirm Dialog ---

const ARCHIVE_REASONS = [
  { value: 'died', label: 'It died 😢' },
  { value: 'gave_away', label: 'Gave it away' },
  { value: 'moved', label: 'Moved' },
  { value: 'other', label: 'Other' },
] as const;

function ArchiveDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: string, note: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<string>('');
  const [note, setNote] = useState('');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 400, padding: 24 }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Archive this plant?</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          It will be removed from your watering schedule. Pick a reason so we can learn.
        </p>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Reason
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {ARCHIVE_REASONS.map((r) => (
            <label
              key={r.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: reason === r.value ? 'var(--bg-secondary)' : 'transparent',
                border: `1px solid ${reason === r.value ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              <input
                type="radio"
                name="archive-reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
              />
              {r.label}
            </label>
          ))}
        </div>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Note <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything to remember?"
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 14,
            border: '1px solid var(--border)',
            borderRadius: 8,
            marginBottom: 16,
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              flex: 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => reason && onConfirm(reason, note)}
            disabled={!reason}
            style={{
              background: reason ? 'var(--danger)' : 'var(--border)',
              color: 'white',
              flex: 1,
              cursor: reason ? 'pointer' : 'not-allowed',
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  danger = false,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 360, textAlign: 'center', padding: 24 }}
      >
        <p style={{ fontSize: 16, marginBottom: 24, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              flex: 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: danger ? 'var(--danger)' : 'var(--accent)',
              flex: 1,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main PlantDetail Page ---

export function PlantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [events, setEvents] = useState<PlantEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Show "first plant" celebration if navigated here after adding the very first plant
  const isFirstPlant = (location.state as { firstPlant?: boolean } | null)?.firstPlant === true;

  const [toast, setToast] = useState<string | null>(isFirstPlant ? 'Your first plant! 🌱' : null);
  const [undoToast, setUndoToast] = useState<string | null>(null);
  const [confirmRepot, setConfirmRepot] = useState<{ newSize: string } | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [notesEditing, setNotesEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Fetch plant data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/plants/${id}`).then((r) => r.json()),
      fetch(`/api/plants/${id}/conditions`).then((r) => r.json()).catch(() => []),
      fetch(`/api/plants/${id}/events`).then((r) => r.json()).catch(() => []),
    ])
      .then(([p, c, e]) => {
        setPlant(p);
        setNotesDraft(p.notes ?? '');
        setConditions(Array.isArray(c) ? c : []);
        setEvents(Array.isArray(e) ? e : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  // PUT /api/plants/:id with partial update
  async function updatePlant(fields: Partial<Plant>) {
    if (!id) return;
    const res = await fetch(`/api/plants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error('Update failed');
    const updated = await res.json();
    setPlant(updated);
  }

  // Handle pot size change — may trigger repot dialog
  function handlePotSizeChange(val: string) {
    const newSize = val.replace(/\D/g, '');
    if (!newSize) return;
    setConfirmRepot({ newSize });
  }

  async function confirmRepotYes() {
    if (!confirmRepot) return;
    try {
      await updatePlant({ pot_size_cm: parseInt(confirmRepot.newSize) });
      showToast('Pot size updated — repot logged');
    } catch {
      showToast('Failed to update pot size');
    }
    setConfirmRepot(null);
  }

  function confirmRepotNo() {
    setConfirmRepot(null);
  }

  // Mark as watered — shows a 15s undo toast
  async function handleWater() {
    if (!id) return;
    try {
      const res = await fetch(`/api/plants/${id}/water`, { method: 'POST' });
      if (!res.ok) throw new Error('Water failed');
      const data = await res.json();
      setPlant((prev) => prev ? { ...prev, next_water_date: data.next_water_date, last_watered_at: new Date().toISOString() } : prev);
      // Refresh events
      fetch(`/api/plants/${id}/events`)
        .then((r) => r.json())
        .then((e) => setEvents(Array.isArray(e) ? e : []))
        .catch(() => {});
      setUndoToast(`Watered ✓ Next: ${formatDate(data.next_water_date)}`);
    } catch {
      showToast('Failed to record watering');
    }
  }

  // Undo the most recent watering
  async function handleUndoWater() {
    if (!id) return;
    try {
      const res = await fetch(`/api/plants/${id}/undo-water`, { method: 'POST' });
      if (!res.ok) throw new Error('Undo failed');
      const data = await res.json();
      setPlant((prev) =>
        prev
          ? {
              ...prev,
              next_water_date: data.next_water_date,
              last_watered_at: data.last_watered_at,
            }
          : prev,
      );
      fetch(`/api/plants/${id}/events`)
        .then((r) => r.json())
        .then((e) => setEvents(Array.isArray(e) ? e : []))
        .catch(() => {});
      setUndoToast(null);
      showToast('Watering undone');
    } catch {
      showToast('Undo failed');
    }
  }

  // Resolve condition
  async function handleResolveCondition(conditionId: number) {
    if (!id) return;
    try {
      await fetch(`/api/plants/${id}/conditions/${conditionId}/resolve`, { method: 'POST' });
      setConditions((prev) => prev.filter((c) => c.id !== conditionId));
      showToast('Condition resolved');
    } catch {
      showToast('Failed to resolve condition');
    }
  }

  // Archive plant
  async function handleArchive(reason: string, note: string) {
    if (!id) return;
    try {
      const res = await fetch(`/api/plants/${id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, note }),
      });
      if (!res.ok) throw new Error('archive failed');
      const body = (await res.json()) as { care_duration_days?: number };
      const days = body.care_duration_days ?? 0;
      const name = plant?.name ?? 'Your plant';
      const duration =
        days >= 60
          ? `${Math.round(days / 30)} months`
          : days >= 14
          ? `${Math.round(days / 7)} weeks`
          : `${days} days`;
      showToast(`${name} was in your care for ${duration}. Rest well. 🌿`);
      setTimeout(() => navigate('/'), 3000);
    } catch {
      showToast('Failed to archive plant');
    }
    setConfirmArchive(false);
  }

  // Save notes
  async function handleNotesSave() {
    try {
      await updatePlant({ notes: notesDraft });
      showToast('Notes saved');
    } catch {
      showToast('Failed to save notes');
    }
    setNotesEditing(false);
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
        Loading…
      </div>
    );
  }

  if (error || !plant) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <p style={{ color: 'var(--danger)', marginBottom: 16 }}>
          {error ?? 'Plant not found'}
        </p>
        <button onClick={() => navigate('/')} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          ← Back
        </button>
      </div>
    );
  }

  const lightOptions = [
    { value: 'low', label: 'Low light' },
    { value: 'medium', label: 'Medium light' },
    { value: 'bright_indirect', label: 'Bright indirect' },
    { value: 'direct', label: 'Direct sun' },
  ];
  const sizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ];

  const activeConditions = conditions.filter((c) => c.is_active);

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            color: 'var(--text-secondary)',
            padding: '8px 4px',
            fontSize: 20,
            minWidth: 44,
            minHeight: 44,
          }}
          aria-label="Back to dashboard"
        >
          ←
        </button>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Dashboard</span>
      </div>

      {/* Hero illustration */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {plant.illustration_path ? (
          <img
            src={`/api/illustrations/${encodeURIComponent(plant.illustration_path)}`}
            alt={plant.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <span style={{ fontSize: 80 }}>🌿</span>
        )}
      </div>

      {/* Plant name — inline editable */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
          Plant name
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
          <EditableField
            value={plant.name}
            onSave={(v) => updatePlant({ name: v }).catch(() => showToast('Failed to save'))}
            placeholder="Plant name"
            style={{ fontSize: 24, fontWeight: 700 }}
          />
        </h1>
        <div style={{ fontSize: 14, marginBottom: 6 }}>
          <EditableField
            value={plant.identifier ?? ''}
            onSave={(v) => updatePlant({ identifier: v.trim() === '' ? null : v }).catch(() => showToast('Failed to save'))}
            placeholder="Add identifier (e.g. Blue pot)"
            style={{ fontSize: 14 }}
          />
        </div>
        {plant.species && (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: 14 }}>
            {plant.species}
          </p>
        )}
      </div>

      {/* Info grid */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}
        >
          {/* Location */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Location
            </div>
            <EditableField
              value={plant.location ?? ''}
              onSave={(v) => updatePlant({ location: v }).catch(() => showToast('Failed to save'))}
              placeholder="Add location"
              style={{ fontSize: 15 }}
            />
          </div>

          {/* Pot size */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Pot size
            </div>
            <EditableField
              value={plant.pot_size_cm ? `${plant.pot_size_cm}` : ''}
              onSave={handlePotSizeChange}
              type="number"
              placeholder="cm"
              style={{ fontSize: 15 }}
            />
            {plant.pot_size_cm && (
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>cm</span>
            )}
          </div>

          {/* Light level */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Light level
            </div>
            <EditableSelect
              value={plant.light_level ?? 'medium'}
              options={lightOptions}
              onSave={(v) => updatePlant({ light_level: v }).catch(() => showToast('Failed to save'))}
              style={{ fontSize: 15 }}
            />
          </div>

          {/* Plant size */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Plant size
            </div>
            <EditableSelect
              value={plant.plant_size ?? 'medium'}
              options={sizeOptions}
              onSave={(v) => updatePlant({ plant_size: v }).catch(() => showToast('Failed to save'))}
              style={{ fontSize: 15 }}
            />
          </div>

          {/* Current interval */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Interval
            </div>
            <span style={{ fontSize: 15 }}>
              {plant.current_interval ? `every ${plant.current_interval} days` : '—'}
            </span>
          </div>

          {/* Next watering */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Next watering
            </div>
            <span style={{ fontSize: 15 }}>
              {formatDate(plant.next_water_date)}
            </span>
          </div>
        </div>
      </div>

      {/* Mark as watered */}
      <button
        onClick={handleWater}
        style={{
          width: '100%',
          fontSize: 18,
          fontWeight: 700,
          padding: '16px 24px',
          marginBottom: 12,
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        Watered
      </button>

      {/* Active conditions */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Conditions</h2>
          <a
            href={`/plants/${id}/conditions/new`}
            style={{ fontSize: 13, color: 'var(--accent)' }}
          >
            + Flag condition
          </a>
        </div>

        {activeConditions.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No active conditions</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeConditions.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span
                  style={{
                    background: severityColor(c.severity),
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    textTransform: 'uppercase',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {c.severity}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                    {c.condition_name}
                  </div>
                  {c.symptoms && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {c.symptoms}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleResolveCondition(c.id)}
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    padding: '6px 12px',
                    flexShrink: 0,
                  }}
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event timeline */}
      <div className="card" style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>History</h2>
        {events.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No events yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {events.map((e, i) => (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  paddingBottom: 12,
                  paddingTop: i === 0 ? 0 : 12,
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.3 }}>
                  {eventIcon(e.event_type)}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>
                    {e.event_type.replace(/_/g, ' ')}
                  </div>
                  {e.reason && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {e.reason}
                    </div>
                  )}
                  {e.event_type === 'watered'
                    ? e.new_value && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {e.new_value}
                        </div>
                      )
                    : (e.old_value || e.new_value) && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {e.old_value} → {e.new_value}
                        </div>
                      )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0, textAlign: 'right' }}>
                  {formatDate(e.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Notes</h2>
          {!notesEditing && (
            <button
              onClick={() => {
                setNotesEditing(true);
                setTimeout(() => notesRef.current?.focus(), 50);
              }}
              style={{
                background: 'transparent',
                color: 'var(--accent)',
                fontSize: 13,
                padding: '4px 8px',
              }}
            >
              Edit
            </button>
          )}
        </div>
        {notesEditing ? (
          <>
            <textarea
              ref={notesRef}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={5}
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: 12,
                fontSize: 14,
                resize: 'vertical',
                fontFamily: 'inherit',
                marginBottom: 10,
              }}
              placeholder="Add notes about this plant…"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleNotesSave}
                style={{ flex: 1, fontSize: 14, padding: '10px 16px' }}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setNotesDraft(plant.notes ?? '');
                  setNotesEditing(false);
                }}
                style={{
                  flex: 1,
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  padding: '10px 16px',
                }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <p
            style={{
              fontSize: 14,
              color: plant.notes ? 'var(--text-primary)' : 'var(--text-secondary)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
            onClick={() => setNotesEditing(true)}
          >
            {plant.notes || 'Tap to add notes…'}
          </p>
        )}
      </div>

      {/* Archive plant */}
      <button
        onClick={() => setConfirmArchive(true)}
        style={{
          width: '100%',
          background: 'transparent',
          color: 'var(--danger)',
          border: '1px solid var(--danger)',
          fontSize: 15,
          padding: '14px 24px',
          marginBottom: 12,
        }}
      >
        Archive Plant
      </button>

      {/* Dialogs */}
      {confirmRepot && (
        <ConfirmDialog
          message={`Did you repot this plant? (new pot size: ${confirmRepot.newSize}cm)`}
          confirmLabel="Yes, repotted"
          cancelLabel="No, just updating"
          onConfirm={confirmRepotYes}
          onCancel={confirmRepotNo}
        />
      )}

      {confirmArchive && (
        <ArchiveDialog
          onConfirm={handleArchive}
          onCancel={() => setConfirmArchive(false)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {undoToast && (
        <UndoToast
          message={undoToast}
          onUndo={handleUndoWater}
          onExpire={() => setUndoToast(null)}
        />
      )}
    </div>
  );
}
