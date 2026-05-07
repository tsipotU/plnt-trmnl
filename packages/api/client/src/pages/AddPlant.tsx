import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LightLevelTooltip } from '../components/LightLevelTooltip';
import { PotSizeTooltip } from '../components/PotSizeTooltip';
import { DidYouMeanSplash, type SuggestionOption } from '../components/DidYouMeanSplash';
import {
  EnrichmentSplash,
  type EnrichmentSplashPreview,
} from '../components/EnrichmentSplash';
import { useAiConnection } from '../hooks/useAiConnection';

import { BackBar } from '../components/molecules/BackBar/BackBar.js';
import { FormStep } from '../components/molecules/FormStep/FormStep.js';
import { Callout } from '../components/molecules/Callout/Callout.js';
import { Banner } from '../components/atoms/Banner/Banner.js';
import { Button } from '../components/atoms/Button/Button.js';
import { FieldLabel } from '../components/atoms/FieldLabel/FieldLabel.js';
import './AddPlant.css';

type WateredWhen = 'today' | 'pick' | 'unknown';
type OriginType = '' | 'purchased' | 'received' | 'seedling' | 'unknown';
type SoilFeel = '' | 'bone_dry' | 'dry' | 'slightly_moist' | 'moist' | 'wet';

// Fields that get inline error treatment (shown on submit, cleared on edit).
// Other required fields (pot, location, light) keep the disabled-button pattern.
const INLINE_REQUIRED_FIELDS = ['name'] as const;
type InlineRequiredField = typeof INLINE_REQUIRED_FIELDS[number];

function getMissingInlineRequired(state: { name: string }): InlineRequiredField[] {
  const missing: InlineRequiredField[] = [];
  if (!state.name.trim()) missing.push('name');
  return missing;
}

interface ExistingPlant {
  id: number;
  name: string;
  species?: string | null;
}

function normalizeSpecies(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

interface CatalogSearchResult {
  slug: string;
  latin_name: string;
  primary_common_name: string;
}

const COMMON_ROOMS: string[] = [
  'Living room',
  'Bedroom',
  'Kitchen',
  'Bathroom',
  'Office',
  'Balcony',
];

const CATALOG_SEARCH_DEBOUNCE_MS = 200;

const SOIL_FEEL_OPTIONS: { value: Exclude<SoilFeel, ''>; label: string }[] = [
  { value: 'bone_dry', label: 'Bone dry — pulling away from the pot' },
  { value: 'dry', label: 'Dry on top, lightly damp underneath' },
  { value: 'slightly_moist', label: 'Slightly moist throughout' },
  { value: 'moist', label: 'Moist — recently watered' },
  { value: 'wet', label: 'Wet / soggy' },
];

const POT_SIZE_OPTIONS: { value: string; label: string; cm: number }[] = [
  { value: 'Extra Small', label: 'Extra Small (8 cm)', cm: 8 },
  { value: 'Small', label: 'Small (12 cm)', cm: 12 },
  { value: 'Medium', label: 'Medium (18 cm)', cm: 18 },
  { value: 'Large', label: 'Large (24 cm)', cm: 24 },
  { value: 'Extra Large', label: 'Extra Large (30 cm)', cm: 30 },
  { value: 'Other', label: 'Other', cm: 20 },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function AddPlant() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
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
  const [fieldErrors, setFieldErrors] = useState<Set<InlineRequiredField>>(new Set());

  const [splashMode, setSplashMode] = useState<
    'enriching' | 'success' | 'correcting' | 'no-match' | null
  >(null);
  const [splashPlantId, setSplashPlantId] = useState<number | null>(null);
  const [splashTypedName, setSplashTypedName] = useState<string>('');
  const [splashPreview, setSplashPreview] =
    useState<EnrichmentSplashPreview | null>(null);
  const [splashSubmitting, setSplashSubmitting] = useState(false);

  const [fallbackPlantId, setFallbackPlantId] = useState<number | null>(null);
  const [fallbackTypedName, setFallbackTypedName] = useState<string>('');
  const [fallbackSuggestion, setFallbackSuggestion] =
    useState<SuggestionOption | null>(null);
  const [retrying, setRetrying] = useState(false);

  const [isFirstPlant, setIsFirstPlant] = useState(false);

  const { connected: aiConnected } = useAiConnection();

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

  useEffect(() => {
    const query = name.trim();
    if (query.length < 2) {
      setCatalogResults([]);
      setCatalogOpen(false);
      return;
    }
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
    if (catalogSlug) setCatalogSlug(null);
    // Clear inline error as soon as the user starts editing.
    if (fieldErrors.has('name')) {
      setFieldErrors((prev) => {
        const next = new Set(prev);
        next.delete('name');
        return next;
      });
    }
  }

  function resolveLastWateredAt(): string {
    if (wateredWhen === 'today') return today();
    if (wateredWhen === 'pick') return pickedDate;
    return yesterday();
  }

  const needsSoilFeel = wateredWhen === 'unknown';
  const soilFeelMissing = needsSoilFeel && !soilFeel;

  // name is validated inline with visible errors on submit.
  // soilFeel keeps the disabled-button pattern (it's a conditional sub-field).
  // pot/location/light are validated server-side; native required hints cover the UX gap.
  const submitDisabled = loading || soilFeelMissing;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitDisabled) return;

    // Inline validation gate — shows errors for name when missing.
    const missing = getMissingInlineRequired({ name });
    if (missing.length > 0) {
      setFieldErrors(new Set(missing));
      document.getElementById('name')?.focus();
      return;
    }
    setFieldErrors(new Set());

    setLoading(true);
    setError(null);

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

      // #204 — branch on catalogSlug (client-side state set by the typeahead)
      // rather than plant.illustration_path from the server response. Many
      // catalog species don't have an illustration yet (gated on #138), so
      // checking illustration_path incorrectly sends typeahead-resolved plants
      // into the enriching/no-match branch. catalogSlug is the source of truth
      // for "the user explicitly picked a catalog entry".
      if (catalogSlug) {
        await showSuccessSplash(plant.id, name.trim());
        return;
      }
      if (!aiConnected) {
        setSplashMode('no-match');
        return;
      }
      setSplashMode('enriching');
      await waitForEnrichment(plant.id, name.trim());
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

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
        // Swallow and retry until deadline.
      }
    }

    setSplashMode(null);
    setSplashPlantId(null);
    navigate(`/plants/${plantId}`, {
      state: { firstPlant: isFirstPlant, stillEnriching: true },
    });
  }

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

        if (species) {
          try {
            const c = await fetch(
              `/api/catalog/entry?species=${encodeURIComponent(species)}`,
            );
            if (c.ok) {
              const entry = (await c.json()) as { placement_tips?: string[] } | null;
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
    void typedName;
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
      const r = await fetch(`/api/plants/${splashPlantId}/retry-enrichment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
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
    setSplashMode(null);
    setSplashPlantId(null);
    setSplashPreview(null);
    setSplashTypedName('');
  }

  /* ===== Splash takeovers ===== */

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

  /* ===== Main form ===== */

  return (
    <form className="p7l-addplant" onSubmit={handleSubmit} noValidate>
      <BackBar onBack={() => navigate('/')} backLabel="← Cancel" eyebrow="New plant" />

      <div className="p7l-addplant__form">
        <FormStep num="01 · Species" title="What kind of plant?">
          <div>
            <FieldLabel htmlFor="name" required>
              Plant species or type
            </FieldLabel>
            <div className="p7l-addplant__combobox" style={{ marginTop: 6 }}>
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
                  setTimeout(() => setCatalogOpen(false), 120);
                }}
                placeholder="Monstera, Ficus, Pothos…"
                autoFocus
                required
                aria-required="true"
                aria-invalid={fieldErrors.has('name') || undefined}
                aria-describedby={fieldErrors.has('name') ? 'name-error' : undefined}
                autoComplete="off"
                role="combobox"
                aria-expanded={catalogOpen}
                aria-controls="catalog-suggestions"
                aria-autocomplete="list"
                style={fieldErrors.has('name') ? { borderColor: 'var(--status-overdue)' } : undefined}
              />
              {catalogOpen && catalogResults.length > 0 && (
                <ul
                  id="catalog-suggestions"
                  role="listbox"
                  className="p7l-addplant__suggestions"
                >
                  {catalogResults.map((r) => (
                    <li
                      key={r.slug}
                      role="option"
                      aria-label={r.latin_name}
                      aria-selected={catalogSlug === r.slug}
                      className="p7l-addplant__suggestion"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectCatalog(r);
                      }}
                    >
                      <div className="p7l-addplant__suggestion-name">
                        {r.latin_name}
                      </div>
                      <div className="p7l-addplant__suggestion-common">
                        {r.primary_common_name}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {fieldErrors.has('name') && (
              <p id="name-error" role="alert" className="p7l-addplant__field-error">
                Species is required
              </p>
            )}
            <p className="p7l-addplant__hint">
              {isFirstPlant
                ? 'Search for your plant by species name. Personal names go in Identifier.'
                : 'Personal names go in Identifier below.'}
            </p>
          </div>

          {catalogSlug && (
            <Callout tone="accent">
              <strong>✓ Catalog match.</strong> Care baselines will be applied
              instantly when you add this plant.
            </Callout>
          )}

          <div>
            <FieldLabel htmlFor="identifier" hint="Helps tell similar plants apart at a glance.">
              Identifier (optional)
            </FieldLabel>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. the big one, mom's cutting"
              style={{ marginTop: 6 }}
            />
          </div>
        </FormStep>

        <FormStep num="02 · Last watered" title="When did you last water?">
          <div
            className="p7l-addplant__seg"
            role="group"
            aria-label="When did you last water"
            aria-required="true"
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
                aria-pressed={wateredWhen === opt.value}
                onClick={() => setWateredWhen(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {wateredWhen === 'pick' && (
            <input
              type="date"
              value={pickedDate}
              max={today()}
              onChange={(e) => setPickedDate(e.target.value)}
              aria-label="Last watered date"
            />
          )}

          {wateredWhen === 'unknown' && (
            <div>
              <FieldLabel
                htmlFor="soilFeel"
                required
                hint="Helps us calibrate the first watering interval."
              >
                How does the soil feel?
              </FieldLabel>
              <select
                id="soilFeel"
                value={soilFeel}
                onChange={(e) => setSoilFeel(e.target.value as SoilFeel)}
                required
                aria-invalid={soilFeelMissing ? true : undefined}
                style={{
                  marginTop: 6,
                  borderColor: soilFeelMissing ? 'var(--status-overdue)' : undefined,
                }}
              >
                <option value="">Select soil feel…</option>
                {SOIL_FEEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </FormStep>

        <FormStep num="03 · Home" title="Where does it live?">
          <div>
            <div className="p7l-addplant__label-row">
              <FieldLabel htmlFor="potSize" required>Pot size</FieldLabel>
              <PotSizeTooltip />
            </div>
            <select
              id="potSize"
              value={potCategory}
              onChange={(e) => setPotCategory(e.target.value)}
              required
            >
              <option value="">Select size…</option>
              {POT_SIZE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="location" required>Location</FieldLabel>
            <div className="p7l-addplant__rooms" style={{ marginTop: 6 }}>
              {COMMON_ROOMS.map((room) => {
                const active = location.trim().toLowerCase() === room.toLowerCase();
                return (
                  <button
                    key={room}
                    type="button"
                    onClick={() => setLocation(room)}
                    aria-pressed={active}
                    style={{
                      background: active ? 'var(--ink)' : 'var(--bg)',
                      color: active ? 'var(--bg)' : 'var(--ink)',
                      border: '0.5px solid var(--ink)',
                      padding: '5px 10px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 10,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      fontWeight: 500,
                      cursor: 'pointer',
                      borderRadius: 0,
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
              placeholder="Or type your own (e.g. living room window)"
              required
            />
          </div>

          <div>
            <div className="p7l-addplant__label-row">
              <FieldLabel htmlFor="lightLevel" required>Light level</FieldLabel>
              <LightLevelTooltip />
            </div>
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

          <div>
            <FieldLabel htmlFor="plantSize">Plant size</FieldLabel>
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
        </FormStep>

        <FormStep num="04 · Provenance" title="Where's it from?">
          <div>
            <FieldLabel htmlFor="originType">Origin</FieldLabel>
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
              <FieldLabel htmlFor="originSource">
                {originType === 'purchased' ? 'Shop or source' : 'From whom'}
              </FieldLabel>
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
              {!name.trim() ? (
                <p className="p7l-helper">Select a species first to pick a mother plant.</p>
              ) : (() => {
                const sameSpeciesCandidates = existingPlants.filter(
                  (p) => normalizeSpecies(p.species) === normalizeSpecies(name),
                );
                return sameSpeciesCandidates.length === 0 ? (
                  <p className="p7l-helper">
                    No {name.trim()} in your collection yet — leave this blank.
                  </p>
                ) : (
                  <>
                    <FieldLabel htmlFor="motherPlantId">Mother plant</FieldLabel>
                    <select
                      id="motherPlantId"
                      value={motherPlantId}
                      onChange={(e) => setMotherPlantId(e.target.value)}
                    >
                      <option value="">— optional —</option>
                      {sameSpeciesCandidates.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </>
                );
              })()}
            </div>
          )}
        </FormStep>

        {error && (
          <div style={{ padding: '0 18px 8px' }}>
            <Banner tone="error" title="Couldn't add plant">
              {error}
            </Banner>
          </div>
        )}
      </div>

      <div className="p7l-addplant__submit">
        <Button
          type="button"
          variant="ghost"
          fullWidth
          onClick={() => navigate('/')}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={submitDisabled}
          loading={loading}
        >
          {loading ? 'Adding…' : 'Add plant'}
        </Button>
      </div>
    </form>
  );
}
