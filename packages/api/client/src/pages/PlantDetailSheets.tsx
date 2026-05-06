import { useEffect, useState } from 'react';
import { Sheet } from '../components/molecules/Sheet/Sheet.js';
import { RadioRow } from '../components/molecules/RadioRow/RadioRow.js';
import { Tabs, type TabItem } from '../components/molecules/Tabs/Tabs.js';
import { ConditionRow, type ConditionSeverity } from '../components/molecules/ConditionRow/ConditionRow.js';
import { EmptyState } from '../components/molecules/EmptyState/EmptyState.js';
import { FieldLabel } from '../components/atoms/FieldLabel/FieldLabel.js';
import { Button } from '../components/atoms/Button/Button.js';
import { useDialogContext } from '../context/DialogContext.js';
import { GENERIC_CONDITIONS } from '../data/genericConditions.js';

/* Page-local Sheet-based modals for PlantDetail. Replaces:
   - ConfirmDialog (was inline in PlantDetail.tsx) → RepotSheet
   - ArchiveDialog component                       → ArchiveSheet
   - ConditionsPicker component                    → ConditionsSheet
   - (new)                                         → NoteSheet (replaces NotesLog inline composer)
   - (new placeholder)                             → PhotoSheet
   All wrap the Sheet molecule; bodies are page-specific. */

/* ---------- Repot confirmation ---------- */

export interface RepotConfirmation {
  newSize: string;
  category: string | null;
}

interface RepotSheetProps {
  open: boolean;
  pendingChange: RepotConfirmation | null;
  /** Called for the "Other" path when the user enters a cm value to confirm. */
  otherCmDraft: string;
  onOtherCmDraftChange: (v: string) => void;
  onSubmitOtherCm: () => void;
  onConfirmYes: () => void;
  onConfirmNo: () => void;
  onClose: () => void;
}

export function RepotSheet({
  open,
  pendingChange,
  otherCmDraft,
  onOtherCmDraftChange,
  onSubmitOtherCm,
  onConfirmYes,
  onConfirmNo,
  onClose,
}: RepotSheetProps) {
  // "Other" pre-confirmation: cm input + Set button
  if (pendingChange?.category === 'Other' && !pendingChange.newSize) {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title="Custom pot size"
        footer={
          <>
            <Button variant="ghost" fullWidth onClick={onConfirmNo}>Cancel</Button>
            <Button
              variant="primary"
              fullWidth
              onClick={onSubmitOtherCm}
              disabled={!otherCmDraft.trim()}
            >
              Set
            </Button>
          </>
        }
      >
        <div style={{ padding: 18 }}>
          <FieldLabel htmlFor="pdsh-cm">Diameter</FieldLabel>
          <input
            id="pdsh-cm"
            autoFocus
            type="number"
            min={1}
            max={150}
            value={otherCmDraft}
            onChange={(e) => onOtherCmDraftChange(e.target.value)}
            placeholder="cm"
            style={{
              marginTop: 6,
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--ink)',
              borderRadius: 0,
              fontFamily: 'var(--font-sans)',
              fontSize: 16,
              color: 'var(--ink)',
            }}
          />
        </div>
      </Sheet>
    );
  }

  // Standard confirmation: Yes/No
  return (
    <Sheet
      open={open && !!pendingChange?.newSize}
      onClose={onClose}
      title="Did you repot?"
      footer={
        <>
          <Button variant="ghost" fullWidth onClick={onConfirmNo}>No, just updating</Button>
          <Button variant="primary" fullWidth onClick={onConfirmYes}>Yes, repotted</Button>
        </>
      }
    >
      <div style={{ padding: '0 18px', fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>
        Updating to{' '}
        <strong style={{ color: 'var(--ink)' }}>
          {pendingChange?.category}
          {pendingChange?.newSize ? `, ${pendingChange.newSize} cm` : ''}
        </strong>
        . If you actually repotted the plant, p7l logs a repot event so the
        care log reflects the move.
      </div>
    </Sheet>
  );
}

/* ---------- Archive ---------- */

export type ArchiveReason = 'died' | 'gave_away' | 'moved' | 'other';

const ARCHIVE_OPTIONS: ReadonlyArray<{ id: ArchiveReason; label: string; desc: string }> = [
  { id: 'died',      label: '🕊️ It passed away', desc: "Saved to memorial. We'll keep its stats." },
  { id: 'gave_away', label: '🎁 Gave it away',   desc: 'Mark as gifted to a friend or family.' },
  { id: 'moved',     label: '📦 Moved away',     desc: 'Plant is at a different home now.' },
  { id: 'other',     label: '📝 Other',          desc: 'Something else.' },
];

interface ArchiveSheetProps {
  open: boolean;
  plantName: string;
  onConfirm: (reason: ArchiveReason, note: string) => void;
  onClose: () => void;
}

export function ArchiveSheet({ open, plantName, onConfirm, onClose }: ArchiveSheetProps) {
  const [reason, setReason] = useState<ArchiveReason>('died');
  const [note, setNote] = useState('');
  const { setArchiveDialogOpen } = useDialogContext();

  // Preserve the existing FeedbackButton hide-while-open behavior
  useEffect(() => {
    if (!open) return;
    setArchiveDialogOpen(true);
    return () => setArchiveDialogOpen(false);
  }, [open, setArchiveDialogOpen]);

  // Reset draft when re-opened
  useEffect(() => {
    if (open) {
      setReason('died');
      setNote('');
    }
  }, [open]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Archive ${plantName}`}
      footer={
        <>
          <Button variant="ghost" fullWidth onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            fullWidth
            onClick={() => onConfirm(reason, note)}
          >
            Archive
          </Button>
        </>
      }
    >
      <div style={{ padding: '0 18px 14px', fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--ink-2)' }}>
        What happened? p7l keeps the record either way.
      </div>
      <div role="radiogroup" aria-label="Archive reason">
        {ARCHIVE_OPTIONS.map((opt) => (
          <RadioRow
            key={opt.id}
            label={opt.label}
            description={opt.desc}
            checked={reason === opt.id}
            onSelect={() => setReason(opt.id)}
            name="archive-reason"
            value={opt.id}
          />
        ))}
      </div>
      <div style={{ padding: '14px 18px 18px' }}>
        <FieldLabel htmlFor="pdsh-note">Note (optional)</FieldLabel>
        <textarea
          id="pdsh-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={reason === 'died' ? 'What happened? RIP.' : 'Any context.'}
          style={{
            marginTop: 6,
            width: '100%',
            padding: '10px 12px',
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--ink)',
            borderRadius: 0,
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--ink)',
            resize: 'vertical',
          }}
        />
      </div>
    </Sheet>
  );
}

/* ---------- Conditions picker ---------- */

interface ConditionPick {
  name: string;
  symptoms?: string | null;
  remedy?: string | null;
  severity: ConditionSeverity;
}

interface ConditionsSheetProps {
  open: boolean;
  /** Names already-active on the plant — disable matching rows. */
  activeNames: string[];
  onPick: (c: ConditionPick) => Promise<boolean>;
  onClose: () => void;
}

const CONDITION_TABS: ReadonlyArray<TabItem<'common' | 'custom'>> = [
  { id: 'common', label: 'Common' },
  { id: 'custom', label: 'Custom' },
];

export function ConditionsSheet({ open, activeNames, onPick, onClose }: ConditionsSheetProps) {
  const [tab, setTab] = useState<'common' | 'custom'>('common');
  const [customName, setCustomName] = useState('');
  const [customSeverity, setCustomSeverity] = useState<ConditionSeverity>('info');

  useEffect(() => {
    if (open) {
      setTab('common');
      setCustomName('');
      setCustomSeverity('info');
    }
  }, [open]);

  async function handlePickGeneric(c: typeof GENERIC_CONDITIONS[number]) {
    if (activeNames.includes(c.name)) return;
    const ok = await onPick({
      name: c.name,
      symptoms: c.symptoms ?? null,
      remedy: c.remedy ?? null,
      severity: c.severity as ConditionSeverity,
    });
    if (ok) onClose();
  }

  async function handleSubmitCustom() {
    const trimmed = customName.trim();
    if (!trimmed) return;
    const ok = await onPick({
      name: trimmed,
      symptoms: null,
      remedy: null,
      severity: customSeverity,
    });
    if (ok) onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add condition">
      <Tabs items={CONDITION_TABS} active={tab} onChange={setTab} />
      {tab === 'common' ? (
        <div role="list" aria-label="Common conditions">
          {GENERIC_CONDITIONS.map((c) => {
            const already = activeNames.includes(c.name);
            return (
              <ConditionRow
                key={c.name}
                severity={c.severity as ConditionSeverity}
                name={c.name}
                symptoms={c.symptoms ?? undefined}
                action={
                  already ? (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--ink-3)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      active
                    </span>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => handlePickGeneric(c)}>
                      + Flag
                    </Button>
                  )
                }
              />
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <FieldLabel htmlFor="pdsh-cn">Condition name</FieldLabel>
            <input
              id="pdsh-cn"
              autoFocus
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Cold draft damage"
              style={{
                marginTop: 6,
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--ink)',
                borderRadius: 0,
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                color: 'var(--ink)',
              }}
            />
          </div>
          <div>
            <FieldLabel htmlFor="pdsh-cs">Severity</FieldLabel>
            <select
              id="pdsh-cs"
              value={customSeverity}
              onChange={(e) => setCustomSeverity(e.target.value as ConditionSeverity)}
              style={{
                marginTop: 6,
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--ink)',
                borderRadius: 0,
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                color: 'var(--ink)',
              }}
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmitCustom}
            disabled={!customName.trim()}
          >
            Add condition
          </Button>
        </div>
      )}
    </Sheet>
  );
}

/* ---------- Note ---------- */

interface NoteSheetProps {
  open: boolean;
  plantId: number;
  plantName: string;
  onSaved: () => void;
  onClose: () => void;
  onError: (msg: string) => void;
}

export function NoteSheet({ open, plantId, plantName, onSaved, onClose, onError }: NoteSheetProps) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setBody('');
  }, [open]);

  async function handleSave() {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/plants/${plantId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) throw new Error('save failed');
      onSaved();
      onClose();
    } catch {
      onError('Failed to save note');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Note · ${plantName}`}
      maxHeight="60%"
      footer={
        <>
          <Button variant="ghost" fullWidth onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            fullWidth
            onClick={handleSave}
            disabled={!body.trim() || submitting}
            loading={submitting}
          >
            Save note
          </Button>
        </>
      }
    >
      <div style={{ padding: 18 }}>
        <textarea
          autoFocus
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What did you notice?"
          style={{
            width: '100%',
            padding: 12,
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--ink)',
            borderRadius: 0,
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--ink)',
            resize: 'vertical',
          }}
        />
      </div>
    </Sheet>
  );
}

/* ---------- Photo (placeholder) ---------- */

interface PhotoSheetProps {
  open: boolean;
  plantName: string;
  onClose: () => void;
}

export function PhotoSheet({ open, plantName, onClose }: PhotoSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={`Photos · ${plantName}`}>
      <EmptyState>
        Photos coming in a future wave.
        <br />
        For now, p7l tracks only text-based care log entries.
      </EmptyState>
    </Sheet>
  );
}
