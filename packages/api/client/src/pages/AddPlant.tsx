import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LightLevelTooltip } from '../components/LightLevelTooltip';
import { PotSizeTooltip } from '../components/PotSizeTooltip';
import { DidYouMeanSplash, type SuggestionOption } from '../components/DidYouMeanSplash';
import {
  EnrichmentSplash,
  type EnrichmentSplashPreview,
} from '../components/EnrichmentSplash';

type WateredWhen = 'today' | 'pick' | 'unknown';
type OriginType = '' | 'purchased' | 'received' | 'seedling' | 'unknown';
type SoilFeel = '' | 'bone_dry' | 'dry' | 'slightly_moist' | 'moist' | 'wet';

interface ExistingPlant {
  id: number;
  name: string;
}

interface CatalogSearchResult {
  slug: string;
  latin_name: string;
  category: string;
  primary_common_name: string;
}

// Common rooms surfaced as tappable chips (#2). Custom locations remain supported
// via the free-text input — these are just shortcuts.
const COMMON_ROOMS: string[] = [
  'Living room',
  'Bedroom',
  'Kitchen',
  'Bathroom',
  'Office',
  'Balcony',
];

// Debounce delay for /api/catalog/search-as-you-type lookups. Kept short so the
// dropdown feels responsive while still coalescing rapid keystrokes.
const CATALOG_SEARCH_DEBOUNCE_MS = 200;

const SOIL_FEEL_OPTIONS: { value: Exclude<SoilFeel, ''>; label: string }[] = [
  { value: 'bone_dry', label: 'Bone dry' },
  { value: 'dry', label: 'Dry' },
  { value: 'slightly_moist', label: 'Slightly moist' },
  { value: 'moist', label: 'Moist' },
  { value: 'wet', label: 'Wet' },
];

const POT_SIZE_OPTIONS: { value: string; label: string; cm: number }[] = [
  { value: 'Extra Small', label: 'Extra Small (5–10 cm)', cm: 8 },
  { value: 'Small', label: 'Small (10–15 cm)', cm: 13 },
  { value: 'Medium', label: 'Medium (15–20 cm)', cm: 18 },
  { value: 'Large', label: 'Large (20–30 cm)', cm: 25 },
  { value: 'Extra Large', label: 'Extra Large (30–50 cm)', cm: 40 },
  { value: 'Extra Extra Large', label: 'Extra Extra Large (50–100 cm)', cm: 70 },
];

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function AddPlant() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  // Catalog dropdown state (#2) — when the user picks a suggestion we lock in
  // the slug so POST /api/plants can apply baselines immediately. Typing after
  // selection clears the slug (free-text fallback).
  const [catalogSlug, setCatalogSlug] = useState<string | null>(null);
  const [catalogResults, setCatalogResults] = useState<CatalogSearchResult[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [wateredWhen, setWateredWhen] = useState<WateredWhen>('today');
  const [pickedDate, setPickedDate] = useState(today());
  const [soilFeel, setSoilFeel] = useState<SoilFeel>('');
  const [potCategory, setPotCategory] = useState<string>('');
  const [location, setLocation] = useState('');
  const [lightLevel, setLightLevel] = useState<string>('');
  const [plantSize, setPlantSize] = useState<string>('medium');
  const [originType, setOriginType] = useState<OriginType>('');
  const [originSource, setOriginSource] = useState('');
  const [motherPlantId, setMotherPlantId] = useState<string>('');
  const [existingPlants, setExistingPlants] = useState<ExistingPlant[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Post-add enrichment splash (#72). Three modes:
  //   - 'enriching'  → waiting on Claude callback, showing spinner
  //   - 'success'    → preview with Looks right / Not quite
  //   - 'correcting' → user typing a correction
  //   - null         → splash is closed (form visible)
  const [splashMode, setSplashMode] = useState<
    'enriching' | 'success' | 'correcting' | null
  >(null);
  const [splashPlantId, setSplashPlantId] = useState<number | null>(null);
  const [splashTypedName, setSplashTypedName] = useState<string>('');
  const [splashPreview, setSplashPreview] =
    useState<EnrichmentSplashPreview | null>(null);
  const [splashSubmitting, setSplashSubmitting] = useState(false);

  // Did-you-mean fallback state (issue #39). When enrichment fails, we pull
  // the top fuzzy suggestion from /api/catalog/suggest and offer it here.
  const [fallbackPlantId, setFallbackPlantId] = useState<number | null>(null);
  const [fallbackTypedName, setFallbackTypedName] = useState<string>('');
  const [fallbackSuggestion, setFallbackSuggestion] =
    useState<SuggestionOption | null>(null);
  const [retrying, setRetrying] = useState(false);

  // Track whether this is the first plant (for contextual hints + celebration)
  const [isFirstPlant, setIsFirstPlant] = useState(false);

  useEffect(() => {
    fetch('/api/plants')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        const list = Array.isArray(data) ? (data as ExistingPlant[]) : [];
        setIsFirstPlant(list.length === 0);
        setExistingPlants(list.filter((p) => p && typeof p.id === 'number' && p.name));
      })
      .catch(() => {
        setIsFirstPlant(false);
        setExistingPlants([]);
      });
  }, []);

  // Debounced catalog search (#2). Triggers on every name change; skips when
  // the user has already locked in a selection (catalogSlug set + name matches
  // a selected entry) or when the query is empty/too short.
  useEffect(() => {
    const query = name.trim();
    if (query.length < 2) {
      setCatalogResults([]);
      setCatalogOpen(false);
      return;
    }
    // If the input still exactly matches the selected catalog entry, don't
    // re-query — user hasn't typed since selection.
    if (catalogSlug) {
      setCatalogOpen(false);
      return;
    }

    let cancelled = false;
    const handle = setTimeout(() => {
      fetch(`/api/catalog/search?q=${encodeURIComponent(query)}&limit=8`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data: unknown) => {
          if (cancelled) return;
          const results = Array.isArray(data) ? (data as CatalogSearchResult[]) : [];
          setCatalogResults(results);
          setCatalogOpen(results.length > 0);
        })
        .catch(() => {
          if (cancelled) return;
          setCatalogResults([]);
          setCatalogOpen(false);
        });
    }, CATALOG_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [name, catalogSlug]);

  function handleSelectCatalog(entry: CatalogSearchResult): void {
    setName(entry.latin_name);
    setCatalogSlug(entry.slug);
    setCatalogOpen(false);
    setCatalogResults([]);
  }

  function handleNameChange(value: string): void {
    setName(value);
    // Any typing after a selection breaks the lock and reverts to free-text.
    if (catalogSlug) setCatalogSlug(null);
  }

  function resolveLastWateredAt(): string {
    if (wateredWhen === 'today') return today();
    if (wateredWhen === 'pick') return pickedDate;
    return yesterday();
  }

  const needsSoilFeel = wateredWhen === 'unknown';
  const soilFeelMissing = needsSoilFeel && !soilFeel;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !potCategory || !location.trim() || !lightLevel) return;
    if (soilFeelMissing) return;

    setLoading(true);
    setError(null);

    // Resolve the cm value from the pot category
    const selectedOption = POT_SIZE_OPTIONS.find((o) => o.value === potCategory);
    const potSizeCm = selectedOption?.cm || 20;

    const payload = {
      name: name.trim(),
      catalog_slug: catalogSlug,
      identifier: identifier.trim() || null,
      potSizeCm: potSizeCm,
      pot_size_category: potCategory,
      pot_size_cm: potSizeCm,
      plantSize: plantSize || 'medium',
      location: location.trim(),
      lightLevel: lightLevel,
      lastWateredAt: resolveLastWateredAt(),
      origin_type: originType || null,
      origin_source:
        (originType === 'purchased' || originType === 'received') && originSource.trim()
          ? originSource.trim()
          : null,
      mother_plant_id:
        originType === 'seedling' && motherPlantId ? Number(motherPlantId) : null,
      soil_feel: needsSoilFeel && soilFeel ? soilFeel : null,
    };

    try {
      const res = await fetch('/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? 'Failed to create plant');
        setLoading(false);
        return;
      }

      const plant = await res.json();
      setLoading(false);
      setSplashPlantId(plant.id);
      setSplashTypedName(name.trim());
      setSplashMode('enriching');

      await waitForEnrichment(plant.id, name.trim());
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  /**
   * Poll enrichment status. On success → show the #72 confirmation splash.
   * On failure → fetch a fuzzy suggestion and show the #39 did-you-mean splash.
   * On 10s timeout → navigate to plant detail with a "still enriching" badge.
   *
   * Polling cadence: 1s to keep network quiet; 10s hard ceiling per issue #72.
   */
  async function waitForEnrichment(plantId: number, typedName: string): Promise<void> {
    const deadline = Date.now() + 10_000;
    const interval = 1000;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, interval));
      try {
        const r = await fetch(`/api/plants/${plantId}/enrichment-status`);
        if (r.ok) {
          const data = (await r.json()) as { enrichment_status?: string };
          if (data && data.enrichment_status === 'complete') {
            await showSuccessSplash(plantId, typedName);
            return;
          }
          if (data && data.enrichment_status === 'failed') {
            await showDidYouMean(plantId, typedName);
            return;
          }
        }
      } catch {
        // Swallow and retry until deadline — transient network blips shouldn't
        // burn the whole enrichment flow.
      }
    }

    // Timed out: land on detail with a "still enriching" badge cue. The badge
    // on the detail page renders when enrichment_status is still 'pending'.
    setSplashMode(null);
    setSplashPlantId(null);
    navigate(`/plants/${plantId}`, {
      state: { firstPlant: isFirstPlant, stillEnriching: true },
    });
  }

  /**
   * After enrichment completes, fetch the full plant + (optional) catalog entry
   * so the splash can show species, illustration, and a one-line care preview.
   */
  async function showSuccessSplash(plantId: number, typedName: string): Promise<void> {
    let preview: EnrichmentSplashPreview = {
      species: null,
      illustrationPath: null,
      lightLevel: null,
      waterFrequency: null,
      placementHint: null,
    };

    try {
      const r = await fetch(`/api/plants/${plantId}`);
      if (r.ok) {
        const plant = (await r.json()) as Record<string, unknown>;
        const species = (plant.species as string | null) ?? null;
        const illustrationPath = (plant.illustration_path as string | null) ?? null;
        const lightLevel = (plant.light_level as string | null) ?? null;
        const currentInterval = (plant.current_interval as number | null) ?? null;
        const waterDescription = (plant.water_description as string | null) ?? null;

        preview = {
          species,
          illustrationPath,
          lightLevel,
          waterFrequency:
            waterDescription ??
            (currentInterval != null ? `Every ${currentInterval} days` : null),
          placementHint: null,
        };

        // Best-effort: pull first placement tip from the catalog entry for the
        // species. A missing or failing catalog lookup just leaves the hint
        // unset — the splash degrades gracefully.
        if (species) {
          try {
            const c = await fetch(
              `/api/catalog/entry?species=${encodeURIComponent(species)}`,
            );
            if (c.ok) {
              const entry = (await c.json()) as
                | { placement_tips?: string[] }
                | null;
              const tip = entry?.placement_tips?.[0];
              if (typeof tip === 'string' && tip.length > 0) {
                preview.placementHint = tip;
              }
            }
          } catch {
            // Ignore — placement hint is decorative.
          }
        }
      }
    } catch {
      // Swallow — we still show a minimal splash.
    }

    setSplashPreview(preview);
    setSplashMode('success');
  }

  function handleLooksRight(): void {
    if (splashPlantId == null) return;
    navigate(`/plants/${splashPlantId}`, { state: { firstPlant: isFirstPlant } });
  }

  function handleNotQuite(): void {
    setSplashMode('correcting');
  }

  function handleCancelCorrection(): void {
    setSplashMode('success');
  }

  async function handleSubmitCorrection(corrected: string): Promise<void> {
    if (splashPlantId == null) return;
    const trimmed = corrected.trim();
    if (trimmed.length === 0) return;

    setSplashSubmitting(true);
    try {
      const r = await fetch(
        `/api/plants/${splashPlantId}/retry-enrichment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed }),
        },
      );
      if (!r.ok) {
        setSplashSubmitting(false);
        setSplashMode('success');
        return;
      }
      const plantId = splashPlantId;
      setSplashSubmitting(false);
      setSplashTypedName(trimmed);
      setSplashPreview(null);
      setName(trimmed);
      setSplashMode('enriching');
      await waitForEnrichment(plantId, trimmed);
    } catch {
      setSplashSubmitting(false);
      setSplashMode('success');
    }
  }

  async function showDidYouMean(plantId: number, typedName: string): Promise<void> {
    let top: SuggestionOption | null = null;
    try {
      const r = await fetch(
        `/api/catalog/suggest?q=${encodeURIComponent(typedName)}&limit=1`,
      );
      if (r.ok) {
        const data = (await r.json()) as SuggestionOption[] | unknown;
        if (Array.isArray(data) && data.length > 0) {
          top = data[0] as SuggestionOption;
        }
      }
    } catch {
      // Ignore — we'll just offer the edit-name path with no suggestion.
    }

    // Close the splash so did-you-mean can own the viewport (issue #39 handoff).
    setSplashMode(null);
    setSplashPreview(null);
    setFallbackPlantId(plantId);
    setFallbackTypedName(typedName);
    setFallbackSuggestion(top);
  }

  async function handleAcceptSuggestion(suggestion: SuggestionOption): Promise<void> {
    if (fallbackPlantId == null) return;
    setRetrying(true);
    try {
      const r = await fetch(`/api/plants/${fallbackPlantId}/retry-enrichment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: suggestion.latin_name }),
      });
      if (!r.ok) {
        setRetrying(false);
        setError('Could not retry enrichment. Please edit the name and try again.');
        setFallbackPlantId(null);
        setFallbackSuggestion(null);
        setFallbackTypedName('');
        return;
      }
      const plantId = fallbackPlantId;
      setFallbackPlantId(null);
      setFallbackSuggestion(null);
      setFallbackTypedName('');
      setRetrying(false);
      // Re-enter the #72 splash flow with the corrected name so the user sees
      // the new match confirmation (or falls into did-you-mean again).
      setSplashPlantId(plantId);
      setSplashTypedName(suggestion.latin_name);
      setSplashPreview(null);
      setSplashMode('enriching');
      setName(suggestion.latin_name);
      await waitForEnrichment(plantId, suggestion.latin_name);
    } catch {
      setRetrying(false);
      setError('Network error while retrying enrichment.');
      setFallbackPlantId(null);
      setFallbackSuggestion(null);
      setFallbackTypedName('');
    }
  }

  function handleEditName(): void {
    setFallbackPlantId(null);
    setFallbackSuggestion(null);
    setFallbackTypedName('');
    setRetrying(false);
    // Return fully to the form — also clears any splash state.
    setSplashMode(null);
    setSplashPlantId(null);
    setSplashPreview(null);
    setSplashTypedName('');
  }

  if (fallbackPlantId !== null) {
    return (
      <DidYouMeanSplash
        typedName={fallbackTypedName}
        suggestion={fallbackSuggestion}
        onAccept={handleAcceptSuggestion}
        onEdit={handleEditName}
        retrying={retrying}
      />
    );
  }

  if (splashMode !== null) {
    return (
      <EnrichmentSplash
        mode={splashMode}
        typedName={splashTypedName || name}
        preview={splashPreview}
        onLooksRight={handleLooksRight}
        onNotQuite={handleNotQuite}
        onSubmitCorrection={(v) => {
          void handleSubmitCorrection(v);
        }}
        onCancelCorrection={handleCancelCorrection}
        submitting={splashSubmitting}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <Link
          to="/"
          style={{
            color: 'var(--text-secondary)',
            fontSize: 24,
            lineHeight: 1,
            minWidth: 44,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Back"
        >
          ‹
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Add Plant</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Plant species or type — primary field */}
        <div>
          <label
            htmlFor="name"
            style={{
              display: 'block',
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Plant species or type
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="name"
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => {
                if (catalogResults.length > 0 && !catalogSlug) setCatalogOpen(true);
              }}
              onBlur={() => {
                // Delay close so mousedown on an option can register before blur.
                setTimeout(() => setCatalogOpen(false), 120);
              }}
              placeholder="Monstera, Ficus, Pothos"
              autoFocus
              required
              autoComplete="off"
              role="combobox"
              aria-expanded={catalogOpen}
              aria-controls="catalog-suggestions"
              aria-autocomplete="list"
              style={{ fontSize: 20, fontWeight: 500, width: '100%' }}
            />
            {catalogOpen && catalogResults.length > 0 && (
              <ul
                id="catalog-suggestions"
                role="listbox"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  margin: '4px 0 0 0',
                  padding: 4,
                  listStyle: 'none',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
                  zIndex: 10,
                  maxHeight: 280,
                  overflowY: 'auto',
                }}
              >
                {catalogResults.map((r) => (
                  <li
                    key={r.slug}
                    role="option"
                    aria-label={r.latin_name}
                    aria-selected={catalogSlug === r.slug}
                    onMouseDown={(e) => {
                      // Prevent blur before click lands.
                      e.preventDefault();
                      handleSelectCatalog(r);
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 15,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        'var(--bg-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{r.latin_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {r.primary_common_name}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {isFirstPlant && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Search for your plant by species name
            </p>
          )}
          {catalogSlug && (
            <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>
              ✓ Catalog match — care baselines will be applied instantly.
            </p>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            If you want to give this plant a personal name, use the Identifier field below
          </p>
        </div>

        {/* Identifier — helps tell same-species plants apart */}
        <div>
          <label
            htmlFor="identifier"
            style={{
              display: 'block',
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Identifier <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12, opacity: 0.7 }}>(optional)</span>
          </label>
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g. Hanging basket, Blue pot"
            style={{ fontSize: 15 }}
          />
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isFirstPlant
              ? 'How would you describe this specific plant?'
              : 'Helps tell similar plants apart at a glance.'}
          </p>
        </div>

        {/* When did you last water? */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            When did you last water?
          </label>

          {/* Segmented control */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              background: 'var(--bg-secondary)',
              borderRadius: 8,
              padding: 3,
              gap: 3,
            }}
          >
            {(
              [
                { value: 'today', label: 'Today' },
                { value: 'pick', label: 'Pick a date' },
                { value: 'unknown', label: "Don't know" },
              ] as { value: WateredWhen; label: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setWateredWhen(opt.value)}
                style={{
                  background: wateredWhen === opt.value ? 'var(--accent)' : 'transparent',
                  color:
                    wateredWhen === opt.value ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 4px',
                  fontSize: 13,
                  fontWeight: wateredWhen === opt.value ? 600 : 400,
                  cursor: 'pointer',
                  minHeight: 44,
                  transition: 'background 0.15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Date picker container — reserve space to prevent jittering */}
          <div
            style={{
              marginTop: 10,
              minHeight:
                wateredWhen === 'pick' || wateredWhen === 'unknown' ? 'auto' : 44,
            }}
          >
            {wateredWhen === 'pick' && (
              <input
                type="date"
                value={pickedDate}
                max={today()}
                onChange={(e) => setPickedDate(e.target.value)}
              />
            )}

            {wateredWhen === 'unknown' && (
              <div>
                <label
                  htmlFor="soilFeel"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    marginBottom: 6,
                  }}
                >
                  How does the soil feel?{' '}
                  <span
                    style={{
                      textTransform: 'none',
                      letterSpacing: 0,
                      fontSize: 12,
                      opacity: 0.7,
                    }}
                  >
                    *
                  </span>
                </label>
                <select
                  id="soilFeel"
                  value={soilFeel}
                  onChange={(e) => setSoilFeel(e.target.value as SoilFeel)}
                  required
                  aria-invalid={soilFeelMissing ? true : undefined}
                  style={{
                    width: '100%',
                    borderColor: soilFeelMissing ? 'var(--danger)' : undefined,
                  }}
                >
                  <option value="">Select soil feel…</option>
                  {SOIL_FEEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    marginTop: 4,
                  }}
                >
                  Helps us calibrate the first watering interval.
                </p>
              </div>
            )}
          </div>

          {isFirstPlant && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
              When did you last water it? Pick &lsquo;Don&rsquo;t know&rsquo; if unsure
            </p>
          )}
        </div>

        {/* Optional fields */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 8,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: -4,
            }}
          >
            Plant details
          </p>

          {/* Pot size */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 6 }}>
              <label
                htmlFor="potSize"
                style={{ display: 'block', fontSize: 14, color: 'var(--text-secondary)' }}
              >
                Pot size <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12, opacity: 0.7 }}>*</span>
              </label>
              <PotSizeTooltip />
            </div>
            <select
              id="potSize"
              value={potCategory}
              onChange={(e) => setPotCategory(e.target.value)}
              style={{ width: '100%' }}
              required
            >
              <option value="">Select size…</option>
              {POT_SIZE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {isFirstPlant && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                Pick a size range
              </p>
            )}
          </div>

          {/* Location — room picker + free-text (#2) */}
          <div>
            <label
              htmlFor="location"
              style={{ display: 'block', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}
            >
              Location <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12, opacity: 0.7 }}>*</span>
            </label>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginBottom: 8,
              }}
            >
              {COMMON_ROOMS.map((room) => {
                const active = location.trim().toLowerCase() === room.toLowerCase();
                return (
                  <button
                    key={room}
                    type="button"
                    onClick={() => setLocation(room)}
                    aria-pressed={active}
                    style={{
                      background: active ? 'var(--accent)' : 'var(--bg-primary)',
                      color: active ? 'white' : 'var(--text-primary)',
                      border: active
                        ? '1px solid var(--accent)'
                        : '1px solid var(--border)',
                      borderRadius: 999,
                      padding: '6px 12px',
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                      minHeight: 32,
                    }}
                  >
                    {room}
                  </button>
                );
              })}
            </div>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Or type your own (e.g. Kitchen windowsill)"
              required
            />
            {isFirstPlant && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                Tap a room or type a custom location
              </p>
            )}
          </div>

          {/* Light level */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label
                htmlFor="lightLevel"
                style={{ display: 'block', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 0 }}
              >
                Light level <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12, opacity: 0.7 }}>*</span>
              </label>
              <LightLevelTooltip />
            </div>
            <div style={{ marginTop: 6 }}></div>
            <select
              id="lightLevel"
              value={lightLevel}
              onChange={(e) => setLightLevel(e.target.value)}
              required
            >
              <option value="">Select light level…</option>
              <option value="low">Low light</option>
              <option value="medium">Medium light</option>
              <option value="bright_indirect">Bright indirect</option>
              <option value="direct">Direct sun</option>
            </select>
          </div>

          {/* Plant size */}
          <div>
            <label
              htmlFor="plantSize"
              style={{ display: 'block', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}
            >
              Plant size
            </label>
            <select
              id="plantSize"
              value={plantSize}
              onChange={(e) => setPlantSize(e.target.value)}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>

          {/* Origin */}
          <div>
            <label
              htmlFor="originType"
              style={{ display: 'block', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}
            >
              Origin
            </label>
            <select
              id="originType"
              value={originType}
              onChange={(e) => setOriginType(e.target.value as OriginType)}
            >
              <option value="">— choose —</option>
              <option value="purchased">Purchased</option>
              <option value="received">Received as gift</option>
              <option value="seedling">Grown from seedling</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          {(originType === 'purchased' || originType === 'received') && (
            <div>
              <label
                htmlFor="originSource"
                style={{ display: 'block', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}
              >
                {originType === 'purchased' ? 'Shop or source' : 'From whom'}
              </label>
              <input
                id="originSource"
                type="text"
                value={originSource}
                onChange={(e) => setOriginSource(e.target.value)}
                placeholder={originType === 'purchased' ? 'e.g. Intratuin Amsterdam' : 'e.g. Mom'}
              />
            </div>
          )}

          {originType === 'seedling' && existingPlants.length > 0 && (
            <div>
              <label
                htmlFor="motherPlantId"
                style={{ display: 'block', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}
              >
                Mother plant
              </label>
              <select
                id="motherPlantId"
                value={motherPlantId}
                onChange={(e) => setMotherPlantId(e.target.value)}
              >
                <option value="">— optional —</option>
                {existingPlants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Inline error */}
        {error && (
          <div
            style={{
              background: 'rgba(231, 76, 60, 0.1)',
              border: '1px solid var(--danger)',
              borderRadius: 8,
              padding: '12px 16px',
              color: 'var(--danger)',
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={
            loading ||
            !name.trim() ||
            !potCategory ||
            !location.trim() ||
            !lightLevel ||
            soilFeelMissing
          }
          style={{
            width: '100%',
            fontSize: 17,
            fontWeight: 600,
            padding: '14px 0',
            borderRadius: 12,
            opacity:
              !name.trim() ||
              !potCategory ||
              !location.trim() ||
              !lightLevel ||
              soilFeelMissing
                ? 0.5
                : 1,
            marginTop: 4,
          }}
        >
          {loading ? 'Adding...' : 'Add Plant'}
        </button>
      </form>
    </div>
  );
}
