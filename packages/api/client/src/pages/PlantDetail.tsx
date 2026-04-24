import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArchiveDialog } from '../components/ArchiveDialog';
import { ConditionsPicker } from '../components/ConditionsPicker';
import { NotesLog } from '../components/NotesLog';
import { buildMemorialMessage, type ArchiveReason } from '../utils/memorial';
import { useDevInfo } from '../hooks/useDevInfo.js';
import {
  daysBetween,
  computeIntervalHistory,
  trendLabel,
  countWaterings,
} from '../utils/stats';
import { GENERIC_CONDITIONS } from '../data/genericConditions';

// --- Types ---

interface PlantAbout {
  common_names: { en: string[]; nl: string[] };
  origin: string;
  toxicity: string;
  lore?: string;
  etymology?: string;
}

interface Plant {
  id: number;
  name: string;
  species: string | null;
  common_name: string | null;
  identifier: string | null;
  location: string | null;
  pot_size_cm: number | null;
  pot_size_category: string | null;
  plant_size: string | null;
  light_level: string | null;
  current_interval: number | null;
  base_interval?: number | null;
  water_ratio?: number | null;
  water_description?: string | null;
  enrichment_status?: string | null;
  next_water_date: string | null;
  last_watered_at: string | null;
  illustration_path: string | null;
  archived: number;
  origin_type: 'purchased' | 'received' | 'seedling' | 'unknown' | null;
  origin_source: string | null;
  mother_plant_id: number | null;
  mother_plant_name: string | null;
  is_converged: number | null;
  created_at: string | null;
  updated_at?: string | null;
  /** #37 — catalog-derived "About this plant" payload, null when no match. */
  about?: PlantAbout | null;
}

const ORIGIN_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '— unset —' },
  { value: 'purchased', label: 'Purchased' },
  { value: 'received', label: 'Received as gift' },
  { value: 'seedling', label: 'Grown from seedling' },
  { value: 'unknown', label: 'Unknown' },
];

function formatOriginSummary(
  type: Plant['origin_type'],
  source: string | null,
  motherName: string | null,
): string {
  if (!type) return '—';
  if (type === 'purchased') return source ? `Purchased from ${source}` : 'Purchased';
  if (type === 'received') return source ? `Gift from ${source}` : 'Gift';
  if (type === 'seedling') return motherName ? `Seedling of ${motherName}` : 'Grown from seedling';
  return 'Unknown origin';
}

interface Condition {
  id: number;
  condition_name: string;
  symptoms: string | null;
  remedy: string | null;
  severity: 'info' | 'warning' | 'critical';
  is_active: number;
}

// #3 — catalog entry (rich care profile)
interface CatalogLightProfile {
  ideal: 'low' | 'medium' | 'bright_indirect' | 'direct';
  tolerance_min: 'low' | 'medium' | 'bright_indirect' | 'direct';
  tolerance_max: 'low' | 'medium' | 'bright_indirect' | 'direct';
  direct_sun_hours: string;
  too_little_symptoms: string;
  too_much_symptoms: string;
}
interface CatalogCondition {
  name: string;
  symptoms: string;
  remedy: string;
  severity: 'info' | 'warning' | 'critical';
  prevention: string;
  is_common: boolean;
}
interface CatalogEntry {
  slug: string;
  latin_name: string;
  light_profile: CatalogLightProfile;
  placement_tips: string[];
  conditions: CatalogCondition[];
}

const LIGHT_LABELS: Record<CatalogLightProfile['ideal'], string> = {
  low: 'Low light',
  medium: 'Medium light',
  bright_indirect: 'Bright indirect',
  direct: 'Direct sun',
};

interface PlantEvent {
  id: number;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  created_at: string;
}

const POT_SIZE_CATEGORIES: { value: string; label: string; cm: number | null }[] = [
  { value: 'Extra Small', label: 'Extra Small (5–10 cm)', cm: 8 },
  { value: 'Small', label: 'Small (10–15 cm)', cm: 13 },
  { value: 'Medium', label: 'Medium (15–20 cm)', cm: 18 },
  { value: 'Large', label: 'Large (20–30 cm)', cm: 25 },
  { value: 'Extra Large', label: 'Extra Large (30–50 cm)', cm: 40 },
  { value: 'Other', label: 'Other', cm: null },
];

function formatPotSize(category: string | null, cm: number | null): string {
  if (category) {
    if (category === 'Other') return cm != null ? `${cm} cm` : '—';
    return cm != null ? `${category} (${cm} cm)` : category;
  }
  return cm != null ? `${cm} cm` : '—';
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
    schedule_congested: '🚦',
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

const ACTIVE_CONDITIONS_EXPLANATION = 'Conditions are problems affecting your plant — things like root rot, leaf yellowing, or pest infestations. When flagged, plnt-trmnl suggests how to address them.';

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  );
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
    const t = setTimeout(onExpire, 7000);
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
        animation: 'fadeOut 1s ease-in-out 6s forwards',
      }}
      onAnimationEnd={onExpire}
    >
      <style>{`
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 28,
        }}
      >
        Undo
      </button>
    </div>
  );
}

// --- Confirm Dialog ---

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

// --- About This Plant card (#37) ---

/**
 * Collapsible "About <plant_name>" card. Sources rich species info from the
 * catalog (joined in the API response). Hidden entirely when `about` is null
 * or lacks any content — falls back gracefully for uncatalogued species.
 */
function AboutCard({ plantName, about }: { plantName: string; about: PlantAbout | null | undefined }) {
  const [expanded, setExpanded] = useState(false);

  if (!about) return null;

  // Hide entirely if everything is empty (shouldn't happen for catalog matches,
  // but guards the day a future enrichment fallback yields all-empty fields).
  const hasAnyContent =
    (about.common_names?.en?.length ?? 0) > 0 ||
    (about.common_names?.nl?.length ?? 0) > 0 ||
    (about.origin && about.origin.length > 0) ||
    (about.toxicity && about.toxicity.length > 0) ||
    (about.lore && about.lore.length > 0) ||
    (about.etymology && about.etymology.length > 0);
  if (!hasAnyContent) return null;

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          width: '100%',
          background: 'transparent',
          color: 'var(--text-primary)',
          padding: 0,
          margin: 0,
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          minHeight: 28,
          fontSize: 16,
          fontWeight: 600,
          border: 'none',
        }}
      >
        <span>About {plantName}</span>
        <span
          aria-hidden="true"
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
            display: 'inline-block',
          }}
        >
          ▶
        </span>
      </button>

      {expanded && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {about.common_names.en.length > 0 && (
            <AboutRow label="Also known as">
              {about.common_names.en.join(', ')}
            </AboutRow>
          )}
          {about.common_names.nl.length > 0 && (
            <AboutRow label="In Dutch">
              {about.common_names.nl.join(', ')}
            </AboutRow>
          )}
          {about.origin && <AboutRow label="Origin">{about.origin}</AboutRow>}
          {about.toxicity && <AboutRow label="Toxicity">{about.toxicity}</AboutRow>}
          {about.lore && <AboutRow label="Lore">{about.lore}</AboutRow>}
          {about.etymology && <AboutRow label="Etymology">{about.etymology}</AboutRow>}
        </div>
      )}
    </div>
  );
}

function AboutRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.5 }}>{children}</div>
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
  const [catalogEntry, setCatalogEntry] = useState<CatalogEntry | null>(null);
  const [showAllCatalogConditions, setShowAllCatalogConditions] = useState(false);
  // #75 — Add-condition picker (generic + species + free-text)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Show "first plant" celebration if navigated here after adding the very first plant
  const isFirstPlant = (location.state as { firstPlant?: boolean } | null)?.firstPlant === true;

  const [toast, setToast] = useState<string | null>(isFirstPlant ? 'Your first plant! 🌱' : null);
  const [undoToast, setUndoToast] = useState<string | null>(null);
  const [confirmRepot, setConfirmRepot] = useState<{ newSize: string; category: string | null } | null>(null);
  const [otherCmDraft, setOtherCmDraft] = useState<string>('');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [conditionsHelpDismissed, setConditionsHelpDismissed] = useState(() => {
    try {
      return localStorage.getItem('plant-conditions-help-dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [devInfoEnabled] = useDevInfo();
  const [devInfoExpanded, setDevInfoExpanded] = useState(false);
  const [renamingSpecies, setRenamingSpecies] = useState(false);
  const [speciesDraft, setSpeciesDraft] = useState('');

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
        setConditions(Array.isArray(c) ? c : []);
        setEvents(Array.isArray(e) ? e : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  // #3 — fetch catalog entry for this plant's species (for Light/Placement/Conditions sections)
  useEffect(() => {
    const species = plant?.species;
    if (!species) {
      setCatalogEntry(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/catalog/entry?species=${encodeURIComponent(species)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((entry) => {
        if (!cancelled) setCatalogEntry(entry as CatalogEntry | null);
      })
      .catch(() => {
        if (!cancelled) setCatalogEntry(null);
      });
    return () => {
      cancelled = true;
    };
  }, [plant?.species]);

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

  // Species rename — sends PUT with new species and surfaces a toast.
  // Re-enrichment runs server-side whenever the species value changes.
  async function submitSpeciesRename() {
    const trimmed = speciesDraft.trim();
    if (!trimmed) {
      setRenamingSpecies(false);
      return;
    }
    if (trimmed === (plant?.species ?? '')) {
      setRenamingSpecies(false);
      return;
    }
    try {
      await updatePlant({ species: trimmed });
      showToast('Species updated — re-checking care profile');
    } catch {
      showToast('Failed to update species');
    }
    setRenamingSpecies(false);
    setSpeciesDraft('');
  }

  // Handle pot size category change — may trigger repot dialog
  function handlePotCategoryChange(category: string) {
    const opt = POT_SIZE_CATEGORIES.find((o) => o.value === category);
    if (!opt) return;
    if (category === 'Other') {
      // Reveal inline input; confirmation happens when user submits a cm value
      setOtherCmDraft(plant?.pot_size_cm ? String(plant.pot_size_cm) : '');
      setConfirmRepot({ newSize: '', category: 'Other' });
      return;
    }
    if (opt.cm == null) return;
    setConfirmRepot({ newSize: String(opt.cm), category });
  }

  function submitOtherCm() {
    const newSize = otherCmDraft.replace(/\D/g, '');
    if (!newSize) return;
    setConfirmRepot({ newSize, category: 'Other' });
  }

  async function confirmRepotYes() {
    if (!confirmRepot || !confirmRepot.newSize) {
      setConfirmRepot(null);
      return;
    }
    try {
      await updatePlant({
        pot_size_cm: parseInt(confirmRepot.newSize),
        pot_size_category: confirmRepot.category,
      });
      showToast('Pot size updated — repot logged');
    } catch {
      showToast('Failed to update pot size');
    }
    setConfirmRepot(null);
    setOtherCmDraft('');
  }

  function confirmRepotNo() {
    setConfirmRepot(null);
    setOtherCmDraft('');
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

  // #3 — flag a catalog condition as active on this plant.
  // Writes a row to the existing plant_conditions table via POST /api/plants/:id/conditions
  // so it appears in the "Active conditions" card above.
  async function handleFlagCatalogCondition(c: CatalogCondition) {
    if (!id) return;
    // Guard: avoid duplicates if already active
    const alreadyActive = conditions.some(
      (existing) => existing.is_active && existing.condition_name === c.name,
    );
    if (alreadyActive) {
      showToast('Already flagged as active');
      return;
    }
    try {
      const res = await fetch(`/api/plants/${id}/conditions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conditionName: c.name,
          symptoms: c.symptoms,
          remedy: c.remedy,
          severity: c.severity,
        }),
      });
      if (!res.ok) throw new Error('flag failed');
      const created = (await res.json()) as Condition;
      setConditions((prev) => [created, ...prev]);
      showToast(`Flagged: ${c.name}`);
    } catch {
      showToast('Failed to flag condition');
    }
  }

  // #75 — Flag an arbitrary condition (generic list, species row, or free text).
  // Funnels through the same POST /api/plants/:id/conditions path as the
  // catalog picker in #3.
  async function handleFlagCondition(payload: {
    name: string;
    symptoms?: string | null;
    remedy?: string | null;
    severity?: 'info' | 'warning' | 'critical';
  }): Promise<boolean> {
    if (!id) return false;
    const alreadyActive = conditions.some(
      (existing) => existing.is_active && existing.condition_name === payload.name,
    );
    if (alreadyActive) {
      showToast('Already flagged as active');
      return false;
    }
    try {
      const res = await fetch(`/api/plants/${id}/conditions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conditionName: payload.name,
          symptoms: payload.symptoms ?? null,
          remedy: payload.remedy ?? null,
          severity: payload.severity ?? 'info',
        }),
      });
      if (!res.ok) throw new Error('flag failed');
      const created = (await res.json()) as Condition;
      setConditions((prev) => [created, ...prev]);
      showToast(`Flagged: ${payload.name}`);
      return true;
    } catch {
      showToast('Failed to flag condition');
      return false;
    }
  }

  // Resolve condition
  async function handleResolveCondition(conditionId: number) {
    if (!id) return;
    try {
      await fetch(`/api/conditions/${conditionId}/resolve`, { method: 'POST' });
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
      const body = (await res.json()) as { created_at?: string; archived_at?: string };
      const name = plant?.name ?? 'Your plant';
      const createdAt = body.created_at ?? new Date().toISOString();
      const archivedAt = body.archived_at ?? new Date().toISOString();
      const message = buildMemorialMessage({
        name,
        reason: reason as ArchiveReason,
        createdAt,
        archivedAt,
      });
      showToast(message);
      setTimeout(() => navigate('/'), 3000);
    } catch {
      showToast('Failed to archive plant');
    }
    setConfirmArchive(false);
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

      {/* Plant name + prominent enriched species — inline editable.
          Species sits directly under the name at a prominent size so users
          can catch misidentification at a glance, with a "Not this? Rename"
          affordance that triggers re-enrichment server-side. */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
          Plant name
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          <EditableField
            value={plant.name}
            onSave={(v) => updatePlant({ name: v }).catch(() => showToast('Failed to save'))}
            placeholder="Plant name"
            style={{ fontSize: 24, fontWeight: 700 }}
          />
        </h1>

        {/* Prominent species block */}
        <div style={{ marginBottom: 10 }}>
          {renamingSpecies ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                autoFocus
                type="text"
                value={speciesDraft}
                onChange={(e) => setSpeciesDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitSpeciesRename();
                  if (e.key === 'Escape') {
                    setRenamingSpecies(false);
                    setSpeciesDraft('');
                  }
                }}
                placeholder="Correct species (Latin or common name)"
                aria-label="Species"
                style={{ flex: 1, minWidth: 200, fontSize: 16 }}
              />
              <button
                type="button"
                onClick={submitSpeciesRename}
                style={{ padding: '8px 14px', fontSize: 14 }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setRenamingSpecies(false);
                  setSpeciesDraft('');
                }}
                style={{
                  padding: '8px 14px',
                  fontSize: 14,
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                }}
              >
                Cancel
              </button>
            </div>
          ) : plant.species ? (
            <>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  fontStyle: 'italic',
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                }}
                data-testid="plant-species"
              >
                {plant.species}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSpeciesDraft(plant.species ?? '');
                  setRenamingSpecies(true);
                }}
                style={{
                  background: 'transparent',
                  color: 'var(--accent)',
                  border: 'none',
                  padding: 0,
                  fontSize: 13,
                  cursor: 'pointer',
                  minHeight: 24,
                }}
              >
                Not this? Rename →
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSpeciesDraft('');
                setRenamingSpecies(true);
              }}
              style={{
                background: 'transparent',
                color: 'var(--accent)',
                border: '1px dashed var(--border)',
                padding: '8px 12px',
                fontSize: 14,
                cursor: 'pointer',
                borderRadius: 'var(--radius)',
              }}
            >
              + Set species
            </button>
          )}
        </div>

        <div style={{ fontSize: 14, marginBottom: 6 }}>
          <EditableField
            value={plant.identifier ?? ''}
            onSave={(v) => updatePlant({ identifier: v.trim() === '' ? null : v }).catch(() => showToast('Failed to save'))}
            placeholder="Add identifier (e.g. Blue pot)"
            style={{ fontSize: 14 }}
          />
        </div>
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
            <EditableSelect
              value={plant.pot_size_category ?? ''}
              options={[
                { value: '', label: plant.pot_size_cm ? `${plant.pot_size_cm} cm` : '—' },
                ...POT_SIZE_CATEGORIES.map((o) => ({ value: o.value, label: o.label })),
              ]}
              onSave={(v) => {
                if (v) handlePotCategoryChange(v);
              }}
              style={{ fontSize: 15 }}
            />
            {plant.pot_size_category && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                {formatPotSize(plant.pot_size_category, plant.pot_size_cm)}
              </div>
            )}
            {confirmRepot?.category === 'Other' && !confirmRepot.newSize && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  type="number"
                  value={otherCmDraft}
                  onChange={(e) => setOtherCmDraft(e.target.value)}
                  placeholder="Diameter in cm"
                  min={1}
                  max={150}
                  autoFocus
                  style={{ flex: 1, fontSize: 15 }}
                />
                <button
                  type="button"
                  onClick={submitOtherCm}
                  style={{ padding: '6px 12px', fontSize: 14 }}
                >
                  Set
                </button>
                <button
                  type="button"
                  onClick={confirmRepotNo}
                  style={{
                    padding: '6px 12px',
                    fontSize: 14,
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Cancel
                </button>
              </div>
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

          {/* Origin */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Origin
            </div>
            <EditableSelect
              value={plant.origin_type ?? ''}
              options={ORIGIN_TYPE_OPTIONS}
              onSave={(v) =>
                updatePlant({ origin_type: v === '' ? null : v }).catch(() =>
                  showToast('Failed to save'),
                )
              }
              style={{ fontSize: 15 }}
            />
            {(plant.origin_type === 'purchased' || plant.origin_type === 'received') && (
              <div style={{ marginTop: 6 }}>
                <EditableField
                  value={plant.origin_source ?? ''}
                  onSave={(v) =>
                    updatePlant({ origin_source: v.trim() === '' ? null : v.trim() }).catch(() =>
                      showToast('Failed to save'),
                    )
                  }
                  placeholder={plant.origin_type === 'purchased' ? 'Shop or source' : 'From whom'}
                  style={{ fontSize: 14, color: 'var(--text-secondary)' }}
                />
              </div>
            )}
            {plant.origin_type && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                {formatOriginSummary(
                  plant.origin_type,
                  plant.origin_source,
                  plant.mother_plant_name ??
                    (plant.mother_plant_id != null ? `#${plant.mother_plant_id}` : null),
                )}
              </div>
            )}
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
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Conditions</h2>
          <button
            onClick={() => {
              setConditionsHelpDismissed(false);
            }}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              minWidth: 20,
              minHeight: 20,
            }}
            title="Learn about conditions"
          >
            ?
          </button>
          {/* #75 — Explicit "Add condition" entry point */}
          <button
            onClick={() => {
              setPickerOpen(true);
            }}
            aria-label="Add condition"
            style={{
              marginLeft: 'auto',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '6px 12px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            + Add condition
          </button>
        </div>

        {!conditionsHelpDismissed && (
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 12,
              marginBottom: 12,
              fontSize: 14,
              color: 'var(--text-primary)',
              lineHeight: 1.5,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              {ACTIVE_CONDITIONS_EXPLANATION}
            </div>
            <button
              onClick={() => {
                setConditionsHelpDismissed(true);
                try {
                  localStorage.setItem('plant-conditions-help-dismissed', 'true');
                } catch {
                  // localStorage not available
                }
              }}
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '6px 12px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Got it
            </button>
          </div>
        )}

        {activeConditions.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            No active conditions
          </p>
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
                  aria-label={`Remove ${c.condition_name}`}
                  title="Mark resolved"
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

      {/* About this plant (#37) — collapsible catalog-sourced card.
          Keep this section self-contained; #3 (conditions) and #74 (species
          header) touch neighbouring blocks, so merges stay mechanical. */}
      <AboutCard plantName={plant.name} about={plant.about} />

      {/* #3 — Light mismatch warning.
          Renders when the catalog says this species prefers a different light level
          than what the user has configured for this plant. Unblocks #76. */}
      {catalogEntry && plant.light_level && plant.light_level !== catalogEntry.light_profile.ideal && (
        <div
          role="alert"
          aria-label="Light mismatch warning"
          style={{
            background: 'rgba(243, 156, 18, 0.12)',
            border: '1px solid var(--warning)',
            borderRadius: 'var(--radius)',
            padding: 12,
            marginBottom: 12,
            fontSize: 14,
            color: 'var(--text-primary)',
            lineHeight: 1.5,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>☀️</span>
          <div>
            <strong>Light mismatch.</strong>{' '}
            {catalogEntry.latin_name} prefers{' '}
            <strong>{LIGHT_LABELS[catalogEntry.light_profile.ideal].toLowerCase()}</strong>, but this
            plant is set to{' '}
            <strong>{LIGHT_LABELS[plant.light_level as CatalogLightProfile['ideal']]?.toLowerCase() ?? plant.light_level}</strong>
            {plant.location ? ` (${plant.location})` : ''} — consider moving it.
          </div>
        </div>
      )}

      {/* #3 — Light profile section (catalog-driven) */}
      {catalogEntry && (
        <div className="card" style={{ marginBottom: 12 }} data-testid="catalog-light-section">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Light</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '8px 12px', margin: 0, fontSize: 14 }}>
            <dt style={{ color: 'var(--text-secondary)' }}>Ideal</dt>
            <dd style={{ margin: 0 }}>{LIGHT_LABELS[catalogEntry.light_profile.ideal]}</dd>

            <dt style={{ color: 'var(--text-secondary)' }}>Tolerance</dt>
            <dd style={{ margin: 0 }}>
              {LIGHT_LABELS[catalogEntry.light_profile.tolerance_min]}
              {' to '}
              {LIGHT_LABELS[catalogEntry.light_profile.tolerance_max]}
            </dd>

            <dt style={{ color: 'var(--text-secondary)' }}>Direct sun</dt>
            <dd style={{ margin: 0 }}>{catalogEntry.light_profile.direct_sun_hours}</dd>

            <dt style={{ color: 'var(--text-secondary)' }}>Too little</dt>
            <dd style={{ margin: 0 }}>{catalogEntry.light_profile.too_little_symptoms}</dd>

            <dt style={{ color: 'var(--text-secondary)' }}>Too much</dt>
            <dd style={{ margin: 0 }}>{catalogEntry.light_profile.too_much_symptoms}</dd>
          </dl>
        </div>
      )}

      {/* #3 — Placement tips section (catalog-driven) */}
      {catalogEntry && catalogEntry.placement_tips.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }} data-testid="catalog-placement-section">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Placement</h2>
          <ul style={{ paddingLeft: 20, margin: 0, fontSize: 14, lineHeight: 1.55 }}>
            {catalogEntry.placement_tips.map((tip, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* #3 — Catalog conditions section (top 5 highlighted; tap to flag as active) */}
      {catalogEntry && catalogEntry.conditions.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }} data-testid="catalog-conditions-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Common conditions</h2>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Tap a condition to flag as active
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {(showAllCatalogConditions
              ? catalogEntry.conditions
              : catalogEntry.conditions.filter((c) => c.is_common)
            ).map((c, i) => {
              const activeAlready = conditions.some(
                (existing) => existing.is_active && existing.condition_name === c.name,
              );
              return (
                <button
                  key={`${c.name}-${i}`}
                  onClick={() => handleFlagCatalogCondition(c)}
                  disabled={activeAlready}
                  style={{
                    background: c.is_common ? 'var(--bg-secondary)' : 'transparent',
                    color: 'var(--text-primary)',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    borderRadius: 0,
                    padding: '10px 0',
                    textAlign: 'left',
                    cursor: activeAlready ? 'default' : 'pointer',
                    opacity: activeAlready ? 0.55 : 1,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                  aria-label={`Flag ${c.name} as active`}
                >
                  <span
                    style={{
                      background: severityColor(c.severity),
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
                    {c.severity}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                      {c.is_common && (
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--accent)',
                            border: '1px solid var(--accent)',
                            padding: '1px 6px',
                            borderRadius: 10,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Common
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      {c.symptoms}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Remedy:</strong> {c.remedy}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Prevention:</strong> {c.prevention}
                    </div>
                  </div>
                  {activeAlready && (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0, marginTop: 3 }}>
                      active
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowAllCatalogConditions((v) => !v)}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              fontSize: 13,
              padding: '8px 12px',
              marginTop: 12,
              width: '100%',
            }}
          >
            {showAllCatalogConditions
              ? 'Show top 5 only'
              : `Show all ${catalogEntry.conditions.length} conditions`}
          </button>
        </div>
      )}

      {/* Summary stats + calibration trend */}
      {(() => {
        const wateringCount = countWaterings(events);
        const daysSinceAdded = plant.created_at
          ? daysBetween(plant.created_at, new Date().toISOString())
          : null;
        const intervalHistory = computeIntervalHistory(events);
        const trend = trendLabel(intervalHistory);
        return (
          <div className="card" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Health overview</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 12,
                marginBottom: intervalHistory.length > 0 ? 16 : 0,
              }}
            >
              <StatCell label="Total waterings" value={String(wateringCount)} />
              <StatCell
                label="Current interval"
                value={plant.current_interval ? `${plant.current_interval} days` : '—'}
              />
              <StatCell
                label="Days since added"
                value={daysSinceAdded != null ? String(daysSinceAdded) : '—'}
              />
              <StatCell
                label="Status"
                value={plant.is_converged ? 'Converged ✓' : 'Calibrating'}
              />
            </div>
            {intervalHistory.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Calibration trend
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {intervalHistory.join(' → ')}
                </div>
                {trend && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {trend}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Event timeline */}
      <div className="card" style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>History</h2>
        {events.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            No care history yet — water your plant for the first time to start tracking.
          </p>
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
                  {e.event_type === 'enrichment_complete' ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        ✓ Care profile added
                      </div>
                      {e.reason && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {e.reason.replace('Claude enrichment: ', '')}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>
                        {e.event_type.replace(/_/g, ' ')}
                      </div>
                      {e.reason && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {e.reason}
                        </div>
                      )}
                      {['watered', 'overflow_rebalance', 'schedule_congested'].includes(e.event_type)
                        ? null
                        : (e.old_value || e.new_value) && (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                              {e.old_value} → {e.new_value}
                            </div>
                          )}
                    </>
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

      {/* Notes log */}
      <NotesLog plantId={Number(id)} showToast={showToast} />

      {/* Developer info — visible only when Settings > "Show developer info" is on.
          Collapsed by default; expand to inspect enrichment mechanics.
          Issue #74. */}
      {devInfoEnabled && (() => {
        const enrichmentEvent = events.find((e) => e.event_type === 'enrichment_complete');
        // Infer source from the event reason prefix. Today only Claude enrichment
        // exists; #56 (clipboard) + #58 (manual paste) will extend this.
        const sourceFromReason = enrichmentEvent?.reason?.includes('Claude')
          ? 'Claude (Agent SDK)'
          : enrichmentEvent
            ? 'enrichment'
            : plant.enrichment_status === 'complete'
              ? 'enrichment'
              : plant.species
                ? 'manual'
                : '—';
        const enrichmentTimestamp = enrichmentEvent?.created_at ?? null;
        return (
          <div className="card" style={{ marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setDevInfoExpanded((v) => !v)}
              aria-expanded={devInfoExpanded}
              style={{
                width: '100%',
                background: 'transparent',
                color: 'var(--text-primary)',
                border: 'none',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: 32,
              }}
            >
              <span>Developer info</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {devInfoExpanded ? '▾' : '▸'}
              </span>
            </button>
            {devInfoExpanded && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  columnGap: 12,
                  rowGap: 6,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <div>Source</div>
                <div style={{ color: 'var(--text-primary)' }}>{sourceFromReason}</div>

                <div>Confidence</div>
                <div style={{ color: 'var(--text-primary)' }}>—</div>

                <div>Status</div>
                <div style={{ color: 'var(--text-primary)' }}>
                  {plant.enrichment_status ?? '—'}
                </div>

                <div>Base interval</div>
                <div style={{ color: 'var(--text-primary)' }}>
                  {plant.base_interval != null ? `${plant.base_interval} days` : '—'}
                </div>

                <div>Current interval</div>
                <div style={{ color: 'var(--text-primary)' }}>
                  {plant.current_interval != null ? `${plant.current_interval} days` : '—'}
                </div>

                <div>Water ratio</div>
                <div style={{ color: 'var(--text-primary)' }}>
                  {plant.water_ratio != null ? plant.water_ratio.toString() : '—'}
                </div>

                <div>Water description</div>
                <div style={{ color: 'var(--text-primary)' }}>
                  {plant.water_description ?? '—'}
                </div>

                <div>Enriched at</div>
                <div style={{ color: 'var(--text-primary)' }}>
                  {enrichmentTimestamp
                    ? new Date(enrichmentTimestamp).toLocaleString('en-GB')
                    : '—'}
                </div>
              </div>
            )}
          </div>
        );
      })()}

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
      {confirmRepot && confirmRepot.newSize && (
        <ConfirmDialog
          message={`Did you repot this plant? (${confirmRepot.category}, ${confirmRepot.newSize} cm)`}
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

      {/* #75 — Conditions picker (generic + species + free-text) */}
      <ConditionsPicker
        open={pickerOpen}
        speciesConditions={
          catalogEntry
            ? catalogEntry.conditions.filter((c) => c.is_common).slice(0, 5).map((c) => ({
                name: c.name,
                symptoms: c.symptoms,
                remedy: c.remedy,
                severity: c.severity,
                prevention: c.prevention,
              }))
            : []
        }
        activeNames={activeConditions.map((c) => c.condition_name)}
        onClose={() => setPickerOpen(false)}
        onPick={(p) =>
          handleFlagCondition({
            name: p.name,
            symptoms: p.symptoms ?? null,
            remedy: p.remedy ?? null,
            severity: p.severity,
          })
        }
      />

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
