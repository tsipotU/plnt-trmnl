import { useState } from 'react';
import {
  GENERIC_CONDITIONS,
  type GenericCondition,
} from '../data/genericConditions';

export interface PickerSpeciesCondition {
  name: string;
  symptoms: string;
  remedy: string;
  severity: 'info' | 'warning' | 'critical';
  prevention?: string;
}

export interface PickerCondition {
  name: string;
  symptoms?: string | null;
  remedy?: string | null;
  severity: 'info' | 'warning' | 'critical';
}

interface Props {
  open: boolean;
  /** Top 5 is_common catalog entries for this species (empty when no catalog match) */
  speciesConditions: PickerSpeciesCondition[];
  /** Names of already-active conditions — disable matching rows */
  activeNames: string[];
  onClose: () => void;
  /**
   * Commit a picked condition. Returns true on success so the picker can close;
   * returns false to stay open (e.g. validation, duplicate).
   */
  onPick: (c: PickerCondition) => Promise<boolean>;
}

function severityTint(s: 'info' | 'warning' | 'critical'): string {
  if (s === 'critical') return 'var(--danger)';
  if (s === 'warning') return 'var(--warning)';
  return 'var(--accent)';
}

function Row({
  name,
  description,
  severity,
  disabled,
  onClick,
}: {
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Flag ${name} as active`}
      style={{
        background: 'transparent',
        color: 'var(--text-primary)',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        borderRadius: 0,
        padding: '10px 0',
        textAlign: 'left',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        width: '100%',
      }}
    >
      <span
        style={{
          background: severityTint(severity),
          color: 'white',
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 10,
          textTransform: 'uppercase',
          flexShrink: 0,
          marginTop: 3,
        }}
      >
        {severity}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{description}</div>
      </div>
      {disabled && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            flexShrink: 0,
            marginTop: 3,
          }}
        >
          active
        </span>
      )}
    </button>
  );
}

export function ConditionsPicker({
  open,
  speciesConditions,
  activeNames,
  onClose,
  onPick,
}: Props) {
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherDraft, setOtherDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const activeSet = new Set(activeNames);

  async function commit(c: PickerCondition) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const ok = await onPick(c);
      if (ok) {
        setOtherOpen(false);
        setOtherDraft('');
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function commitOther() {
    const name = otherDraft.trim();
    if (!name) return;
    await commit({ name, severity: 'info' });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add condition"
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
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Add condition</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '4px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Generic — always shown */}
        <div style={{ marginBottom: 16 }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              margin: '0 0 8px 0',
            }}
          >
            Common to any plant
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {GENERIC_CONDITIONS.map((c: GenericCondition) => (
              <Row
                key={`generic-${c.name}`}
                name={c.name}
                description={c.symptoms}
                severity={c.severity}
                disabled={activeSet.has(c.name) || submitting}
                onClick={() =>
                  commit({
                    name: c.name,
                    symptoms: c.symptoms,
                    remedy: c.remedy,
                    severity: c.severity,
                  })
                }
              />
            ))}
          </div>
        </div>

        {/* Species-specific — hidden if no catalog match */}
        {speciesConditions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                margin: '0 0 8px 0',
              }}
            >
              Common for this species
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {speciesConditions.map((c) => (
                <Row
                  key={`species-${c.name}`}
                  name={c.name}
                  description={c.symptoms}
                  severity={c.severity}
                  disabled={activeSet.has(c.name) || submitting}
                  onClick={() =>
                    commit({
                      name: c.name,
                      symptoms: c.symptoms,
                      remedy: c.remedy,
                      severity: c.severity,
                    })
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Free-text fallback */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {!otherOpen ? (
            <button
              type="button"
              onClick={() => setOtherOpen(true)}
              style={{
                background: 'transparent',
                color: 'var(--text-primary)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius)',
                padding: '10px 12px',
                fontSize: 13,
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
              }}
            >
              Other — describe
            </button>
          ) : (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Describe the condition
              </label>
              <textarea
                value={otherDraft}
                onChange={(e) => setOtherDraft(e.target.value)}
                placeholder="Describe the condition in a few words"
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 14,
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  marginBottom: 10,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setOtherOpen(false);
                    setOtherDraft('');
                  }}
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    flex: 1,
                    minHeight: 40,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={commitOther}
                  disabled={!otherDraft.trim() || submitting}
                  style={{
                    background: otherDraft.trim() ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: otherDraft.trim() ? 'white' : 'var(--text-secondary)',
                    flex: 1,
                    minHeight: 40,
                    cursor: otherDraft.trim() ? 'pointer' : 'not-allowed',
                    opacity: otherDraft.trim() ? 1 : 0.6,
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
