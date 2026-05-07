import { useState, useEffect, useCallback } from 'react';
import { Navigate, useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { CalibrationModal } from '../components/CalibrationModal.js';
import { NotesLog } from '../components/NotesLog.js';
import { useDevInfo } from '../hooks/useDevInfo.js';
import { useAiConnection } from '../hooks/useAiConnection.js';
import { buildMemorialMessage } from '../utils/memorial.js';
import {
  daysBetween,
  computeIntervalHistory,
  trendLabel,
  countWaterings,
} from '../utils/stats.js';

import { BackBar } from '../components/molecules/BackBar/BackBar.js';
import { SectionHead } from '../components/molecules/SectionHead/SectionHead.js';
import { DetailDataGrid, DataCell } from '../components/molecules/DetailDataGrid/DetailDataGrid.js';
import { QuickActionRow, QuickAction } from '../components/molecules/QuickActionRow/QuickActionRow.js';
import { ConditionRow } from '../components/molecules/ConditionRow/ConditionRow.js';
import { CareLogEntry } from '../components/molecules/CareLogEntry/CareLogEntry.js';
import { PhotoStripCell } from '../components/molecules/PhotoStripCell/PhotoStripCell.js';
import { InfoCard } from '../components/molecules/InfoCard/InfoCard.js';
import { EmptyState } from '../components/molecules/EmptyState/EmptyState.js';
import { StatRow, Stat } from '../components/molecules/StatRow/StatRow.js';
import { Toast } from '../components/molecules/Toast/Toast.js';
import { Banner } from '../components/atoms/Banner/Banner.js';
import { Button } from '../components/atoms/Button/Button.js';
import { Chip } from '../components/atoms/Chip/Chip.js';
import { Pictogram } from '../components/atoms/Pictogram/Pictogram.js';

import { PlantDetailHero } from './PlantDetailHero.js';
import {
  RepotSheet,
  ArchiveSheet,
  ConditionsSheet,
  NoteSheet,
  PhotoSheet,
  type ArchiveReason,
  type RepotConfirmation,
} from './PlantDetailSheets.js';
import './PlantDetail.css';

/* ===== Types ============================================================ */

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
  calibration_cycle?: number | null;
  created_at: string | null;
  updated_at?: string | null;
  about?: PlantAbout | null;
}

interface Condition {
  id: number;
  condition_name: string;
  symptoms: string | null;
  remedy: string | null;
  severity: 'info' | 'warning' | 'critical';
  is_active: number;
}

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

interface PlantEvent {
  id: number;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  created_at: string;
}

/* ===== Constants ======================================================== */

const LIGHT_LABELS: Record<CatalogLightProfile['ideal'], string> = {
  low: 'Low light',
  medium: 'Medium light',
  bright_indirect: 'Bright indirect',
  direct: 'Direct sun',
};

const POT_SIZE_CATEGORIES: { value: string; label: string; cm: number | null }[] = [
  { value: 'Extra Small', label: 'Tiny (8 cm)', cm: 8 },
  { value: 'Small', label: 'Small (12 cm)', cm: 12 },
  { value: 'Medium', label: 'Medium (18 cm)', cm: 18 },
  { value: 'Large', label: 'Large (24 cm)', cm: 24 },
  { value: 'Extra Large', label: 'Huge (30 cm)', cm: 30 },
  { value: 'Other', label: 'Other (custom)', cm: null },
];

const ORIGIN_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '— unset —' },
  { value: 'purchased', label: 'Purchased' },
  { value: 'received', label: 'Received as gift' },
  { value: 'seedling', label: 'Grown from seedling' },
  { value: 'unknown', label: 'Unknown' },
];

/* ===== Helpers ========================================================== */

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function formatPotSize(category: string | null, cm: number | null): string {
  if (cm == null && !category) return '—';
  if (cm != null && category) return `${cm} cm · ${category}`;
  if (cm != null) return `${cm} cm`;
  return category ?? '—';
}

function eventIcon(type: string): string {
  const icons: Record<string, string> = {
    watered: '💧',
    fertilized: '🌿',
    pruned: '✂️',
    repotted: '🪴',
    note: '✎',
    photo: '📷',
    enrichment_complete: '✓',
    overflow_rebalance: '↔',
    schedule_congested: '⤵',
  };
  return icons[type] ?? '·';
}

function lightLabelFor(level: string | null): string {
  if (!level) return '—';
  if (level in LIGHT_LABELS) return LIGHT_LABELS[level as CatalogLightProfile['ideal']];
  return level;
}

/* ===== Page ============================================================= */

type SheetKind = 'repot' | 'archive' | 'conditions' | 'note' | 'photo' | null;

export function PlantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [events, setEvents] = useState<PlantEvent[]>([]);
  const [catalogEntry, setCatalogEntry] = useState<CatalogEntry | null>(null);
  const [showAllCatalogConditions, setShowAllCatalogConditions] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conditionsHelpDismissed, setConditionsHelpDismissed] = useState(() => {
    try {
      return localStorage.getItem('plant-conditions-help-dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const [sheet, setSheet] = useState<SheetKind>(null);
  const [pendingRepot, setPendingRepot] = useState<RepotConfirmation | null>(null);
  const [otherCmDraft, setOtherCmDraft] = useState('');
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);
  const [devInfoExpanded, setDevInfoExpanded] = useState(false);

  // Toast state — uses the Toast molecule with optional undo action.
  const [toast, setToast] = useState<{
    message: string;
    durationMs: number;
    action?: React.ReactNode;
  } | null>(null);

  const isFirstPlant = (location.state as { firstPlant?: boolean } | null)?.firstPlant === true;
  const stillEnrichingHint =
    (location.state as { stillEnriching?: boolean } | null)?.stillEnriching === true;

  const [devInfoEnabled] = useDevInfo();
  const { connected: aiConnected, loading: aiLoading } = useAiConnection();

  const showToast = useCallback((message: string) => {
    setToast({ message, durationMs: 1800 });
  }, []);

  const showUndoToast = useCallback((message: string, onUndo: () => void) => {
    setToast({
      message,
      durationMs: 5000,
      action: (
        <button
          type="button"
          onClick={() => {
            onUndo();
            setToast(null);
          }}
        >
          Undo
        </button>
      ),
    });
  }, []);

  useEffect(() => {
    if (isFirstPlant) showToast('Your first plant! 🌱');
    // We deliberately fire this only once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- Fetch plant + conditions + events --- */
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
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, [id]);

  /* --- Fetch catalog entry by species --- */
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

  /* --- Mutations --- */

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

  function handlePotCategoryChange(category: string) {
    const opt = POT_SIZE_CATEGORIES.find((o) => o.value === category);
    if (!opt) return;
    if (category === 'Other') {
      setOtherCmDraft(plant?.pot_size_cm ? String(plant.pot_size_cm) : '');
      setPendingRepot({ newSize: '', category: 'Other' });
      setSheet('repot');
      return;
    }
    if (opt.cm == null) return;
    setPendingRepot({ newSize: String(opt.cm), category });
    setSheet('repot');
  }

  function submitOtherCm() {
    const newSize = otherCmDraft.replace(/\D/g, '');
    if (!newSize) return;
    setPendingRepot({ newSize, category: 'Other' });
  }

  async function confirmRepotYes() {
    if (!pendingRepot || !pendingRepot.newSize) {
      setPendingRepot(null);
      setSheet(null);
      return;
    }
    try {
      await updatePlant({
        pot_size_cm: parseInt(pendingRepot.newSize),
        pot_size_category: pendingRepot.category,
      });
      showToast('Pot size updated — repot logged');
    } catch {
      showToast('Failed to update pot size');
    }
    setPendingRepot(null);
    setOtherCmDraft('');
    setSheet(null);
  }

  function confirmRepotNo() {
    setPendingRepot(null);
    setOtherCmDraft('');
    setSheet(null);
  }

  async function handleWater() {
    if (!id) return;
    try {
      const res = await fetch(`/api/plants/${id}/water`, { method: 'POST' });
      if (!res.ok) throw new Error('Water failed');
      const data = await res.json();
      setPlant((prev) =>
        prev
          ? {
              ...prev,
              next_water_date: data.next_water_date,
              last_watered_at: new Date().toISOString(),
            }
          : prev,
      );
      fetch(`/api/plants/${id}/events`)
        .then((r) => r.json())
        .then((e) => setEvents(Array.isArray(e) ? e : []))
        .catch(() => {});
      showUndoToast(`Watered ✓ Next: ${formatDate(data.next_water_date)}`, handleUndoWater);
    } catch {
      showToast('Failed to record watering');
    }
  }

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
      showToast('Watering undone');
    } catch {
      showToast('Undo failed');
    }
  }

  async function handleFlagCatalogCondition(c: CatalogCondition) {
    if (!id) return;
    if (
      conditions.some((existing) => existing.is_active && existing.condition_name === c.name)
    ) {
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

  async function handleFlagFromSheet(p: {
    name: string;
    symptoms?: string | null;
    remedy?: string | null;
    severity: 'info' | 'warning' | 'critical';
  }): Promise<boolean> {
    if (!id) return false;
    if (
      conditions.some((existing) => existing.is_active && existing.condition_name === p.name)
    ) {
      showToast('Already flagged as active');
      return false;
    }
    try {
      const res = await fetch(`/api/plants/${id}/conditions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conditionName: p.name,
          symptoms: p.symptoms ?? null,
          remedy: p.remedy ?? null,
          severity: p.severity,
        }),
      });
      if (!res.ok) throw new Error('flag failed');
      const created = (await res.json()) as Condition;
      setConditions((prev) => [created, ...prev]);
      showToast(`Flagged: ${p.name}`);
      return true;
    } catch {
      showToast('Failed to flag condition');
      return false;
    }
  }

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

  async function handleArchive(reason: ArchiveReason, note: string) {
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
      const message = buildMemorialMessage({
        name,
        reason,
        createdAt: body.created_at ?? new Date().toISOString(),
        archivedAt: body.archived_at ?? new Date().toISOString(),
      });
      showToast(message);
      setSheet(null);
      navigate(`/archive/${id}`, { replace: true });
    } catch {
      showToast('Failed to archive plant');
      setSheet(null);
    }
  }

  /* --- Render guards --- */

  if (loading) {
    return <div className="p7l-plant-detail__loading">Loading…</div>;
  }

  if (error || !plant) {
    return (
      <div className="p7l-plant-detail">
        <BackBar onBack={() => navigate('/')} backLabel="← Today" />
        <div className="p7l-plant-detail__error">
          <p>{error ?? 'Plant not found'}</p>
        </div>
      </div>
    );
  }

  if (plant.archived === 1) {
    return <Navigate to={`/archive/${id}`} replace />;
  }

  /* --- Computed --- */

  const activeConditions = conditions.filter((c) => c.is_active);
  const activeNames = activeConditions.map((c) => c.condition_name);
  const wateringCount = countWaterings(events);
  const intervalHistory = computeIntervalHistory(events);
  const trend = trendLabel(intervalHistory);
  const daysSinceAdded = plant.created_at
    ? daysBetween(plant.created_at, new Date().toISOString())
    : null;

  const lightOptions = [
    { value: 'low', label: 'Low light' },
    { value: 'medium', label: 'Medium' },
    { value: 'bright_indirect', label: 'Bright indirect' },
    { value: 'direct', label: 'Direct sun' },
  ];
  const sizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ];

  const visibleCatalogConditions = catalogEntry
    ? showAllCatalogConditions
      ? catalogEntry.conditions
      : catalogEntry.conditions.filter((c) => c.is_common)
    : [];

  const catalogIdealMismatch =
    catalogEntry &&
    plant.light_level &&
    plant.light_level !== catalogEntry.light_profile.ideal;

  /* --- Render --- */

  return (
    <div className="p7l-plant-detail">
      <CalibrationModal onDone={() => {}} />

      <BackBar
        onBack={() => navigate('/')}
        backLabel="← Today"
        eyebrow={plant.location ?? undefined}
      />

      {/* Banners */}
      {stillEnrichingHint &&
        plant.enrichment_status !== 'complete' &&
        !aiLoading &&
        (aiConnected ? (
          <Banner tone="info">
            ⏳ Still enriching — check back shortly
          </Banner>
        ) : (
          <Banner
            tone="warning"
            title="Connect AI"
            action={
              <Link to="/settings" style={{ color: 'inherit' }}>
                Connect →
              </Link>
            }
          >
            ✨ Connect an AI tool to fill in care details for this plant.
          </Banner>
        ))}

      {catalogIdealMismatch && (
        <Banner
          tone="warning"
          title="Light mismatch"
          role="alert"
          aria-label="Light mismatch"
        >
          {catalogEntry!.latin_name} prefers{' '}
          <strong>
            {LIGHT_LABELS[catalogEntry!.light_profile.ideal].toLowerCase()}
          </strong>
          ; this plant is set to{' '}
          <strong>{lightLabelFor(plant.light_level).toLowerCase()}</strong>
          {plant.location ? ` (${plant.location})` : ''} — consider moving it.
        </Banner>
      )}

      {/* Hero */}
      <PlantDetailHero
        plant={plant}
        onSaveName={(v) =>
          updatePlant({ name: v }).catch(() => showToast('Failed to save'))
        }
        onSaveIdentifier={(v) =>
          updatePlant({ identifier: v }).catch(() => showToast('Failed to save'))
        }
        onSaveSpecies={async (v) => {
          try {
            await updatePlant({ species: v });
            showToast('Species updated — re-checking care profile');
          } catch {
            showToast('Failed to update species');
          }
        }}
      />

      {/* Read-only data grid */}
      <DetailDataGrid cols={2}>
        <DataCell label="Last watered" value={formatDate(plant.last_watered_at)} />
        <DataCell
          label="Schedule"
          value={(() => {
            const hasInterval = plant.current_interval != null;
            const hasDate = plant.next_water_date != null;
            const intervalPart = hasInterval
              ? `Every ${plant.current_interval}d${
                  plant.base_interval && plant.base_interval !== plant.current_interval
                    ? ` (base ${plant.base_interval})`
                    : ''
                }`
              : null;
            const datePart = hasDate ? `Next: ${formatDate(plant.next_water_date)}` : null;
            if (intervalPart && datePart) return `${intervalPart} · ${datePart}`;
            if (intervalPart) return intervalPart;
            if (datePart) return datePart;
            return '—';
          })()}
        />
        <DataCell label="Pot" value={formatPotSize(plant.pot_size_category, plant.pot_size_cm)} />
        <DataCell label="Light" value={lightLabelFor(plant.light_level)} />
        <DataCell
          label="Calibration"
          value={
            plant.is_converged === 1
              ? 'Dialed in'
              : `${plant.calibration_cycle ?? 0} of ~5`
          }
        />
      </DetailDataGrid>

      {/* Two-button action row */}
      <div className="p7l-plant-detail__actions">
        <Button
          variant="highlight"
          size="lg"
          fullWidth
          iconLeading={<Pictogram name="drop" size={14} />}
          onClick={handleWater}
        >
          Watered
        </Button>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => showToast('Misting tracking in a future wave')}
        >
          Mist
        </Button>
      </div>

      {/* Quick actions */}
      <QuickActionRow>
        <QuickAction
          icon={<Pictogram name="leaf" size={20} />}
          label="Feed"
          onClick={() => showToast('Feed tracking in a future wave')}
        />
        <QuickAction
          icon={<Pictogram name="scissors" size={20} />}
          label="Prune"
          onClick={() => showToast('Prune tracking in a future wave')}
        />
        <QuickAction
          icon={<Pictogram name="pot" size={20} />}
          label="Repot"
          onClick={() => {
            const el = document.getElementById('p7l-properties');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
        <QuickAction
          icon={<Pictogram name="bookmark" size={20} />}
          label="Photo"
          onClick={() => setSheet('photo')}
        />
        <QuickAction icon="✎" label="Note" onClick={() => setSheet('note')} />
      </QuickActionRow>

      {/* Active conditions */}
      <SectionHead
        label={`Conditions (${activeConditions.length})`}
        action={
          <Chip toggleable onClick={() => setSheet('conditions')}>
            + Add condition
          </Chip>
        }
      />
      {!conditionsHelpDismissed && (
        <div style={{ padding: '0 18px 8px' }}>
          <InfoCard tone="info" title="What is this?">
            Conditions are problems affecting your plant — things like root rot,
            leaf yellowing, or pest infestations. When flagged, p7l suggests
            how to address them.
            <div style={{ marginTop: 10 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConditionsHelpDismissed(true);
                  try {
                    localStorage.setItem('plant-conditions-help-dismissed', 'true');
                  } catch {
                    /* localStorage not available */
                  }
                }}
              >
                Got it
              </Button>
            </div>
          </InfoCard>
        </div>
      )}
      {activeConditions.length === 0 ? (
        <EmptyState align="left">No active conditions. Tap + to flag one.</EmptyState>
      ) : (
        activeConditions.map((c) => (
          <ConditionRow
            key={c.id}
            severity={c.severity}
            name={c.condition_name}
            symptoms={c.symptoms ?? undefined}
            remedy={c.remedy ?? undefined}
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleResolveCondition(c.id)}
                aria-label={`Remove ${c.condition_name}`}
              >
                Resolve
              </Button>
            }
          />
        ))
      )}

      {/* Calibration narrative */}
      <SectionHead label="Calibration" />
      <div style={{ padding: '0 18px 12px' }}>
        <InfoCard title="Watering rhythm">
          {plant.is_converged === 1 ? (
            <>
              Dialed in at <strong>{plant.current_interval} days</strong> after{' '}
              {plant.calibration_cycle ?? 0} cycles. p7l will keep this rhythm and adjust
              seasonally.
            </>
          ) : (plant.calibration_cycle ?? 0) === 0 ? (
            <>
              Just started. Next time you water, p7l will ask one quick question to begin
              calibration.
            </>
          ) : (
            <>
              Calibrating: <strong>{plant.calibration_cycle} of ~5</strong> cycles done.
              Currently watering every {plant.current_interval ?? '?'} days.
            </>
          )}
        </InfoCard>
      </div>

      {/* Catalog Light profile (existing-only) */}
      {catalogEntry && (
        <>
          <SectionHead label="Light profile" />
          <div style={{ padding: '0 18px 12px' }} data-testid="catalog-light-section">
            <InfoCard>
              <dl className="p7l-plant-detail__light-spec">
                <dt>Ideal</dt>
                <dd>{LIGHT_LABELS[catalogEntry.light_profile.ideal]}</dd>
                <dt>Tolerance</dt>
                <dd>
                  {LIGHT_LABELS[catalogEntry.light_profile.tolerance_min]} to{' '}
                  {LIGHT_LABELS[catalogEntry.light_profile.tolerance_max]}
                </dd>
                <dt>Direct sun</dt>
                <dd>{catalogEntry.light_profile.direct_sun_hours}</dd>
                <dt>Too little</dt>
                <dd>{catalogEntry.light_profile.too_little_symptoms}</dd>
                <dt>Too much</dt>
                <dd>{catalogEntry.light_profile.too_much_symptoms}</dd>
              </dl>
            </InfoCard>
          </div>
        </>
      )}

      {/* Catalog Placement (existing-only) */}
      {catalogEntry && catalogEntry.placement_tips.length > 0 && (
        <>
          <SectionHead label="Placement" />
          <div style={{ padding: '0 18px 12px' }} data-testid="catalog-placement-section">
            <InfoCard>
              <ul className="p7l-plant-detail__placement">
                {catalogEntry.placement_tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </InfoCard>
          </div>
        </>
      )}

      {/* Catalog Common conditions (existing-only) */}
      {catalogEntry && catalogEntry.conditions.length > 0 && (
        <div data-testid="catalog-conditions-section">
          <SectionHead
            label="Common conditions"
            action={
              <Chip
                toggleable
                onClick={() => setShowAllCatalogConditions((v) => !v)}
                active={showAllCatalogConditions}
              >
                {showAllCatalogConditions ? 'Top 5' : `All ${catalogEntry.conditions.length}`}
              </Chip>
            }
          />
          {visibleCatalogConditions.map((c, i) => {
            const already = activeNames.includes(c.name);
            return (
              <ConditionRow
                key={`${c.name}-${i}`}
                severity={c.severity}
                name={c.name}
                symptoms={c.symptoms}
                remedy={c.remedy}
                action={
                  already ? (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        color: 'var(--ink-3)',
                        textTransform: 'uppercase',
                      }}
                    >
                      active
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFlagCatalogCondition(c)}
                      aria-label={`Flag ${c.name} as active`}
                    >
                      Flag
                    </Button>
                  )
                }
              />
            );
          })}
        </div>
      )}

      {/* Photos (placeholder) */}
      <SectionHead
        label="Progress photos (0)"
        action={
          <Chip toggleable onClick={() => setSheet('photo')}>
            + Add
          </Chip>
        }
      />
      <div className="p7l-plant-detail__photo-strip">
        <PhotoStripCell variant="add" label="Add photo" onClick={() => setSheet('photo')}>
          <span style={{ fontSize: 18, lineHeight: 1, color: 'var(--ink-3)' }}>+</span>
          <span>Add photo</span>
        </PhotoStripCell>
      </div>

      {/* About */}
      {plant.about && (
        <>
          <SectionHead
            label="About this plant"
            action={
              <Chip
                toggleable
                onClick={() => setAboutOpen((v) => !v)}
                active={aboutOpen}
                aria-label={`About ${plant.name}`}
              >
                {aboutOpen ? 'Hide' : 'Show'}
              </Chip>
            }
          />
          {aboutOpen && (
            <div style={{ padding: '0 18px 12px' }}>
              <InfoCard>
                <dl className="p7l-plant-detail__about">
                  {plant.about.common_names.en?.length > 0 && (
                    <>
                      <dt>Also known as</dt>
                      <dd>{plant.about.common_names.en.join(', ')}</dd>
                    </>
                  )}
                  {plant.about.common_names.nl?.length > 0 && (
                    <>
                      <dt>In Dutch</dt>
                      <dd>{plant.about.common_names.nl.join(', ')}</dd>
                    </>
                  )}
                  {plant.about.origin && (
                    <>
                      <dt>Origin</dt>
                      <dd>{plant.about.origin}</dd>
                    </>
                  )}
                  {plant.about.toxicity && (
                    <>
                      <dt>Toxicity</dt>
                      <dd>{plant.about.toxicity}</dd>
                    </>
                  )}
                  {plant.about.lore && (
                    <>
                      <dt>Lore</dt>
                      <dd>{plant.about.lore}</dd>
                    </>
                  )}
                  {plant.about.etymology && (
                    <>
                      <dt>Etymology</dt>
                      <dd>{plant.about.etymology}</dd>
                    </>
                  )}
                </dl>
              </InfoCard>
            </div>
          )}
        </>
      )}

      {/* Properties (editable) */}
      <SectionHead label="Properties" />
      <div id="p7l-properties">
        <DetailDataGrid cols={2}>
          <DataCell
            editable
            label="Location"
            value={
              <input
                type="text"
                defaultValue={plant.location ?? ''}
                placeholder="Add location"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (plant.location ?? '')) {
                    updatePlant({ location: v === '' ? null : v }).catch(() =>
                      showToast('Failed to save'),
                    );
                  }
                }}
                aria-label="Location"
                style={{
                  background: 'transparent',
                  border: 'none',
                  font: 'inherit',
                  color: 'inherit',
                  padding: 0,
                  width: '100%',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                }}
              />
            }
          />
          <DataCell
            editable
            label="Light"
            value={
              <select
                value={plant.light_level ?? 'medium'}
                onChange={(e) =>
                  updatePlant({ light_level: e.target.value }).catch(() =>
                    showToast('Failed to save'),
                  )
                }
                aria-label="Light level"
                style={{
                  background: 'transparent',
                  border: 'none',
                  font: 'inherit',
                  color: 'inherit',
                  padding: 0,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  width: '100%',
                  cursor: 'pointer',
                }}
              >
                {lightOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            }
          />
          <DataCell
            editable
            label="Pot category"
            value={
              <select
                value={plant.pot_size_category ?? ''}
                onChange={(e) => {
                  if (e.target.value) handlePotCategoryChange(e.target.value);
                }}
                aria-label="Pot size category"
                style={{
                  background: 'transparent',
                  border: 'none',
                  font: 'inherit',
                  color: 'inherit',
                  padding: 0,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  width: '100%',
                  cursor: 'pointer',
                }}
              >
                <option value="">{plant.pot_size_cm ? `${plant.pot_size_cm} cm` : '—'}</option>
                {POT_SIZE_CATEGORIES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            }
          />
          <DataCell
            editable
            label="Origin"
            value={
              <select
                value={plant.origin_type ?? ''}
                onChange={(e) =>
                  updatePlant({
                    origin_type:
                      e.target.value === ''
                        ? null
                        : (e.target.value as Plant['origin_type']),
                  }).catch(() => showToast('Failed to save'))
                }
                aria-label="Origin"
                style={{
                  background: 'transparent',
                  border: 'none',
                  font: 'inherit',
                  color: 'inherit',
                  padding: 0,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  width: '100%',
                  cursor: 'pointer',
                }}
              >
                {ORIGIN_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            }
          />
          <DataCell
            editable
            label="Plant size"
            value={
              <select
                value={plant.plant_size ?? 'medium'}
                onChange={(e) =>
                  updatePlant({ plant_size: e.target.value }).catch(() =>
                    showToast('Failed to save'),
                  )
                }
                aria-label="Plant size"
                style={{
                  background: 'transparent',
                  border: 'none',
                  font: 'inherit',
                  color: 'inherit',
                  padding: 0,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  width: '100%',
                  cursor: 'pointer',
                }}
              >
                {sizeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            }
          />
          <DataCell
            label="Origin source"
            value={
              plant.origin_type === 'purchased' || plant.origin_type === 'received' ? (
                <input
                  type="text"
                  defaultValue={plant.origin_source ?? ''}
                  placeholder={plant.origin_type === 'purchased' ? 'Shop' : 'From whom'}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (plant.origin_source ?? '')) {
                      updatePlant({ origin_source: v === '' ? null : v }).catch(() =>
                        showToast('Failed to save'),
                      );
                    }
                  }}
                  aria-label="Origin source"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    font: 'inherit',
                    color: 'inherit',
                    padding: 0,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    width: '100%',
                  }}
                />
              ) : (
                '—'
              )
            }
          />
        </DetailDataGrid>
      </div>

      {/* Care log */}
      <SectionHead
        label="Care log"
        action={
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.06em',
              color: 'var(--ink-3)',
              textTransform: 'uppercase',
            }}
          >
            {events.length} {events.length === 1 ? 'entry' : 'entries'}
          </span>
        }
      />
      {events.length === 0 ? (
        <EmptyState align="left">
          No care history yet — water your plant to start tracking.
        </EmptyState>
      ) : (
        <div className="p7l-plant-detail__log">
          {events.slice(0, 30).map((e) => {
            const typeLabel =
              e.event_type === 'enrichment_complete'
                ? 'Care profile added'
                : e.event_type.replace(/_/g, ' ');
            const note =
              e.event_type === 'enrichment_complete'
                ? e.reason?.replace('Claude enrichment: ', '')
                : ['watered', 'overflow_rebalance', 'schedule_congested'].includes(e.event_type)
                ? e.reason ?? undefined
                : e.reason ||
                  (e.old_value || e.new_value
                    ? `${e.old_value ?? ''} → ${e.new_value ?? ''}`
                    : undefined);
            return (
              <CareLogEntry
                key={e.id}
                date={formatDate(e.created_at)}
                type={typeLabel}
                icon={eventIcon(e.event_type)}
                note={note}
              />
            );
          })}
        </div>
      )}

      {/* Notes (kept separate per data-shape verification) */}
      <SectionHead label="Notes" />
      <NotesLog
        plantId={Number(id)}
        showToast={showToast}
        refreshKey={notesRefreshKey}
        onAddNote={() => setSheet('note')}
      />

      {/* Health */}
      <SectionHead label="Health" />
      <StatRow cols={4}>
        <Stat num={String(wateringCount)} label="Total waterings" />
        <Stat
          num={plant.current_interval ? `${plant.current_interval}d` : '—'}
          label="Interval"
        />
        <Stat
          num={daysSinceAdded != null ? String(daysSinceAdded) : '—'}
          label="Days since added"
        />
        <Stat
          num={plant.is_converged === 1 ? 'Dialed' : 'Cal'}
          label="Status"
          accent={plant.is_converged === 1 ? 'var(--highlight)' : undefined}
        />
      </StatRow>
      {intervalHistory.length > 0 && (
        <div style={{ padding: '12px 18px' }}>
          <InfoCard title="Calibration trend">
            <div className="p7l-plant-detail__trend-arrow">
              {intervalHistory.join(' → ')}
            </div>
            {trend && <div className="p7l-plant-detail__trend-label">{trend}</div>}
          </InfoCard>
        </div>
      )}

      {/* Developer info */}
      {devInfoEnabled && (
        <>
          <SectionHead
            label="Developer info"
            action={
              <Chip
                toggleable
                onClick={() => setDevInfoExpanded((v) => !v)}
                active={devInfoExpanded}
              >
                {devInfoExpanded ? 'Hide' : 'Show'}
              </Chip>
            }
          />
          {devInfoExpanded && (
            <div style={{ padding: '0 18px 12px' }}>
              <InfoCard>
                <div className="p7l-plant-detail__dev-grid">
                  <div>Source</div>
                  <div>
                    {events.find((e) => e.event_type === 'enrichment_complete')?.reason?.includes(
                      'Claude',
                    )
                      ? 'Claude (Agent SDK)'
                      : plant.enrichment_status === 'complete'
                      ? 'enrichment'
                      : plant.species
                      ? 'manual'
                      : '—'}
                  </div>
                  <div>Status</div>
                  <div>{plant.enrichment_status ?? '—'}</div>
                  <div>Base interval</div>
                  <div>
                    {plant.base_interval != null ? `${plant.base_interval} days` : '—'}
                  </div>
                  <div>Current interval</div>
                  <div>
                    {plant.current_interval != null
                      ? `${plant.current_interval} days`
                      : '—'}
                  </div>
                  <div>Water ratio</div>
                  <div>{plant.water_ratio != null ? plant.water_ratio.toString() : '—'}</div>
                  <div>Water description</div>
                  <div>{plant.water_description ?? '—'}</div>
                  <div>Enriched at</div>
                  <div>
                    {(() => {
                      const ts = events.find(
                        (e) => e.event_type === 'enrichment_complete',
                      )?.created_at;
                      return ts ? new Date(ts).toLocaleString('en-GB') : '—';
                    })()}
                  </div>
                </div>
              </InfoCard>
            </div>
          )}
        </>
      )}

      {/* Danger zone */}
      <SectionHead label="Danger zone" />
      <div className="p7l-plant-detail__danger">
        <Button
          variant="destructive"
          size="lg"
          fullWidth
          onClick={() => setSheet('archive')}
        >
          Archive plant
        </Button>
      </div>

      <div style={{ height: 96 }} />

      {/* Sheets — mounted only when active so they don't run their hooks
          (DialogContext etc.) unnecessarily. */}
      {sheet === 'repot' && (
        <RepotSheet
          open
          pendingChange={pendingRepot}
          otherCmDraft={otherCmDraft}
          onOtherCmDraftChange={setOtherCmDraft}
          onSubmitOtherCm={submitOtherCm}
          onConfirmYes={confirmRepotYes}
          onConfirmNo={confirmRepotNo}
          onClose={confirmRepotNo}
        />
      )}
      {sheet === 'archive' && (
        <ArchiveSheet
          open
          plantName={plant.name}
          onConfirm={handleArchive}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'conditions' && (
        <ConditionsSheet
          open
          activeNames={activeNames}
          onPick={handleFlagFromSheet}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'note' && (
        <NoteSheet
          open
          plantId={Number(id)}
          plantName={plant.name}
          onSaved={() => {
            setNotesRefreshKey((k) => k + 1);
            showToast('Note saved');
          }}
          onClose={() => setSheet(null)}
          onError={showToast}
        />
      )}
      {sheet === 'photo' && (
        <PhotoSheet open plantName={plant.name} onClose={() => setSheet(null)} />
      )}

      {/* Toast */}
      <Toast
        open={!!toast}
        message={toast?.message ?? ''}
        durationMs={toast?.durationMs ?? 1800}
        action={toast?.action}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
