import { useState } from 'react';

type Severity = 'info' | 'warning' | 'critical';

interface ConditionFormProps {
  plantId: number;
  onSave: () => void;
  onClose: () => void;
}

const SEVERITY_OPTIONS: { value: Severity; label: string; color: string }[] = [
  { value: 'info', label: 'Info', color: 'var(--accent)' },
  { value: 'warning', label: 'Warning', color: 'var(--warning)' },
  { value: 'critical', label: 'Critical', color: 'var(--danger)' },
];

export function ConditionForm({ plantId, onSave, onClose }: ConditionFormProps) {
  const [name, setName] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [remedy, setRemedy] = useState('');
  const [severity, setSeverity] = useState<Severity>('info');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError('Condition name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/plants/${plantId}/conditions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          symptoms: symptoms.trim() || null,
          remedy: remedy.trim() || null,
          severity,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Server error (${res.status})`);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save condition');
      setSaving(false);
    }
  }

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      {/* Sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '16px 16px 0 0',
          padding: '20px 16px 32px',
          width: '100%',
          maxWidth: 430,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Flag condition"
      >
        {/* Handle + header */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: 'var(--border)',
              margin: '0 auto 16px',
            }}
          />
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Flag Condition</h2>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: 'rgba(231, 76, 60, 0.1)',
              border: '1px solid var(--danger)',
              borderRadius: 6,
              padding: '10px 12px',
              color: 'var(--danger)',
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* Condition name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Condition name *
          </label>
          <input
            type="text"
            placeholder="e.g. Root rot, Leaf yellowing..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            style={{ background: 'var(--bg-card)' }}
          />
        </div>

        {/* Symptoms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Symptoms
            <span style={{ fontWeight: 400, marginLeft: 4 }}>(optional)</span>
          </label>
          <textarea
            placeholder="What are you observing?"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            rows={3}
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              padding: 12,
              borderRadius: 'var(--radius)',
              fontSize: 16,
              width: '100%',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Remedy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Remedy
            <span style={{ fontWeight: 400, marginLeft: 4 }}>(optional)</span>
          </label>
          <textarea
            placeholder="What action are you taking?"
            value={remedy}
            onChange={(e) => setRemedy(e.target.value)}
            rows={3}
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              padding: 12,
              borderRadius: 'var(--radius)',
              fontSize: 16,
              width: '100%',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Severity segmented control */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Severity
          </label>
          <div
            style={{
              display: 'flex',
              border: '1px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
            role="group"
            aria-label="Severity"
          >
            {SEVERITY_OPTIONS.map((opt, i) => {
              const isActive = severity === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSeverity(opt.value)}
                  style={{
                    flex: 1,
                    background: isActive ? opt.color : 'var(--bg-card)',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                    borderRadius: 0,
                    fontWeight: isActive ? 600 : 400,
                    fontSize: 14,
                    minHeight: 44,
                    padding: '10px 0',
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  aria-pressed={isActive}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              flex: 1,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: 16,
              minHeight: 48,
              borderRadius: 8,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{
              flex: 2,
              background: saving || !name.trim() ? 'rgba(0,168,107,0.4)' : 'var(--accent)',
              color: '#fff',
              fontSize: 16,
              fontWeight: 600,
              minHeight: 48,
              borderRadius: 8,
              cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Condition'}
          </button>
        </div>
      </div>
    </div>
  );
}
