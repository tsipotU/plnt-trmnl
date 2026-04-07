import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type WateredWhen = 'today' | 'pick' | 'unknown';

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
  const [wateredWhen, setWateredWhen] = useState<WateredWhen>('today');
  const [pickedDate, setPickedDate] = useState(today());
  const [potSizeCm, setPotSizeCm] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  const [lightLevel, setLightLevel] = useState<string>('medium');
  const [plantSize, setPlantSize] = useState<string>('medium');

  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resolveLastWateredAt(): string {
    if (wateredWhen === 'today') return today();
    if (wateredWhen === 'pick') return pickedDate;
    return yesterday();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const payload = {
      name: name.trim(),
      potSizeCm: potSizeCm !== '' ? Number(potSizeCm) : 20,
      plantSize: plantSize || 'medium',
      location: location.trim() || '',
      lightLevel: lightLevel || 'medium',
      lastWateredAt: resolveLastWateredAt(),
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

      // Brief "enriching" moment before navigation
      await new Promise((resolve) => setTimeout(resolve, 900));
      navigate(`/plants/${plant.id}`);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
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
        {/* Plant name — primary field */}
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
            Plant Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Monstera, Peace Lily..."
            autoFocus
            required
            style={{ fontSize: 20, fontWeight: 500 }}
          />
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

          {wateredWhen === 'pick' && (
            <input
              type="date"
              value={pickedDate}
              max={today()}
              onChange={(e) => setPickedDate(e.target.value)}
              style={{ marginTop: 10 }}
            />
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
            Optional details
          </p>

          {/* Pot size */}
          <div>
            <label
              htmlFor="potSize"
              style={{ display: 'block', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}
            >
              Pot diameter
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                id="potSize"
                type="number"
                value={potSizeCm}
                onChange={(e) => setPotSizeCm(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="20"
                min={1}
                max={150}
                style={{ flex: 1 }}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: 15, flexShrink: 0 }}>cm</span>
            </div>
          </div>

          {/* Location */}
          <div>
            <label
              htmlFor="location"
              style={{ display: 'block', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}
            >
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Living room, Kitchen windowsill"
            />
          </div>

          {/* Light level */}
          <div>
            <label
              htmlFor="lightLevel"
              style={{ display: 'block', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}
            >
              Light level
            </label>
            <select
              id="lightLevel"
              value={lightLevel}
              onChange={(e) => setLightLevel(e.target.value)}
            >
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
          disabled={loading || !name.trim()}
          style={{
            width: '100%',
            fontSize: 17,
            fontWeight: 600,
            padding: '14px 0',
            borderRadius: 12,
            opacity: !name.trim() ? 0.5 : 1,
            marginTop: 4,
          }}
        >
          {loading ? 'Adding...' : 'Add Plant'}
        </button>
      </form>
    </div>
  );
}
