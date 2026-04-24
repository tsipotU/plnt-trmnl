import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LightLevelTooltip } from '../components/LightLevelTooltip';
import { DidYouMeanSplash, type SuggestionOption } from '../components/DidYouMeanSplash';

type WateredWhen = 'today' | 'pick' | 'unknown';
type OriginType = '' | 'purchased' | 'received' | 'seedling' | 'unknown';
type SoilFeel = '' | 'bone_dry' | 'dry' | 'slightly_moist' | 'moist' | 'wet';

interface ExistingPlant {
  id: number;
  name: string;
}

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
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setEnriching(true);

      await waitForEnrichment(plant.id, name.trim());
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  /**
   * Poll enrichment status. On success → navigate to the plant detail.
   * On failure → fetch a fuzzy suggestion and show the did-you-mean splash.
   */
  async function waitForEnrichment(plantId: number, typedName: string): Promise<void> {
    const deadline = Date.now() + 30_000;
    const interval = 600;

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, interval));
      try {
        const r = await fetch(`/api/plants/${plantId}/enrichment-status`);
        if (r.ok) {
          const data = (await r.json()) as { enrichment_status?: string };
          if (data && data.enrichment_status === 'complete') {
            navigate(`/plants/${plantId}`, { state: { firstPlant: isFirstPlant } });
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

    // Timed out: proceed anyway — the plant detail page has its own enrichment
    // status banner.
    navigate(`/plants/${plantId}`, { state: { firstPlant: isFirstPlant } });
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

    setEnriching(false);
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
      setEnriching(true);
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
    setEnriching(false);
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

  if (enriching) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60dvh',
          gap: 16,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48 }}>✨</div>
        <p style={{ fontSize: 18, fontWeight: 600 }}>Enriching {name}...</p>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Looking up care info and illustration
        </p>
      </div>
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
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Monstera, Ficus, Pothos"
            autoFocus
            required
            style={{ fontSize: 20, fontWeight: 500 }}
          />
          {isFirstPlant && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Search for your plant by species name
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
            <label
              htmlFor="potSize"
              style={{ display: 'block', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}
            >
              Pot size <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12, opacity: 0.7 }}>*</span>
            </label>
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

          {/* Location */}
          <div>
            <label
              htmlFor="location"
              style={{ display: 'block', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}
            >
              Location <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12, opacity: 0.7 }}>*</span>
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Living room, Kitchen windowsill"
              required
            />
            {isFirstPlant && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                Where in your home is this plant?
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
