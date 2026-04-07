import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlantCard } from '../components/PlantCard.js';
import { VacationToggle } from '../components/VacationToggle.js';
import type { Plant } from '../components/PlantCard.js';

export function Dashboard() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/plants')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch plants');
        return r.json();
      })
      .then((data: Plant[]) => setPlants(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          My Plants
        </h1>
        <VacationToggle />
      </div>

      {/* Loading state */}
      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            color: 'var(--text-secondary)',
          }}
        >
          Loading plants...
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div
          className="card"
          style={{
            color: 'var(--danger)',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && plants.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 16px',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🪴</div>
          <p style={{ fontSize: 16, marginBottom: 8 }}>No plants yet.</p>
          <p>Add your first plant!</p>
        </div>
      )}

      {/* Plant list */}
      {!loading && !error && plants.length > 0 && (
        <div>
          {plants.map((plant) => (
            <PlantCard key={plant.id} plant={plant} />
          ))}
        </div>
      )}

      {/* Floating Add button */}
      <Link
        to="/add"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 16,
          left: 16,
          maxWidth: 398,
          margin: '0 auto',
          display: 'block',
          background: 'var(--accent)',
          color: 'white',
          textAlign: 'center',
          padding: '14px 0',
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 17,
          boxShadow: '0 4px 20px rgba(0, 168, 107, 0.35)',
        }}
      >
        + Add Plant
      </Link>

      {/* Bottom padding to clear the floating button */}
      <div style={{ height: 80 }} />
    </div>
  );
}
