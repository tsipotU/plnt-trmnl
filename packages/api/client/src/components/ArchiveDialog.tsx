import { useState, useEffect } from 'react';
import { useDialogContext } from '../context/DialogContext';

export const ARCHIVE_REASONS = [
  { value: 'died', label: 'It died 😢' },
  { value: 'gave_away', label: 'Gave it away' },
  { value: 'moved', label: 'Moved' },
  { value: 'other', label: 'Other' },
] as const;

export type ArchiveReason = (typeof ARCHIVE_REASONS)[number]['value'];

interface ArchiveDialogProps {
  onConfirm: (reason: string, note: string) => void;
  onCancel: () => void;
}

const radioRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
  minHeight: 44,
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 14,
} as const;

const radioInputStyle = {
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  width: 18,
  height: 18,
  borderRadius: '50%',
  border: '2px solid var(--border, #888)',
  display: 'inline-block',
  cursor: 'pointer',
  margin: 0,
  padding: 0,
  background: 'transparent',
  transition: 'border-color 0.2s ease',
  flexShrink: 0,
};

export function ArchiveDialog({ onConfirm, onCancel }: ArchiveDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [note, setNote] = useState('');
  const { setArchiveDialogOpen } = useDialogContext();

  useEffect(() => {
    setArchiveDialogOpen(true);
    return () => setArchiveDialogOpen(false);
  }, [setArchiveDialogOpen]);

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
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Archive this plant?</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          It will be removed from your watering schedule. Pick a reason so we can learn.
        </p>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Reason
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {ARCHIVE_REASONS.map((r) => {
            const selected = reason === r.value;
            return (
              <label
                key={r.value}
                style={{
                  ...radioRowStyle,
                  background: selected ? 'var(--bg-secondary)' : 'transparent',
                  border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 18,
                    height: 18,
                    flexShrink: 0,
                  }}
                >
                  <input
                    type="radio"
                    name="archive-reason"
                    value={r.value}
                    checked={selected}
                    onChange={() => setReason(r.value)}
                    style={{
                      ...radioInputStyle,
                      borderColor: selected ? 'var(--accent)' : 'var(--border, #888)',
                    }}
                  />
                  {selected && (
                    <span
                      style={{
                        position: 'absolute',
                        pointerEvents: 'none',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                      }}
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span>{r.label}</span>
              </label>
            );
          })}
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
            type="button"
            onClick={onCancel}
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              flex: 1,
              minHeight: 44,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => reason && onConfirm(reason, note)}
            disabled={!reason}
            style={{
              background: reason ? 'var(--danger)' : 'var(--bg-muted, var(--border))',
              color: reason ? 'white' : 'var(--text-muted, var(--text-secondary))',
              flex: 1,
              minHeight: 44,
              cursor: reason ? 'pointer' : 'not-allowed',
              opacity: reason ? 1 : 0.5,
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
