import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlantCard } from '../components/PlantCard.js';
import { VacationToggle } from '../components/VacationToggle.js';
import { CalibrationModal } from '../components/CalibrationModal.js';
import type { Plant } from '../components/PlantCard.js';

export function Dashboard() {
  const navigate = useNavigate();
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
      {/* Calibration modal — shown if plants are due for calibration today */}
      <CalibrationModal onDone={() => {}} />

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
          }}
        >
          <div style={{ fontSize: 72, marginBottom: 20 }}>🪴</div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 8,
            }}
          >
            Welcome to Plant TRMNL
          </h2>
          <p
            style={{
              fontSize: 15,
              color: 'var(--text-secondary)',
              marginBottom: 28,
            }}
          >
            Add your first plant to get started
          </p>
          <button
            onClick={() => navigate('/add')}
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '14px 32px',
              fontSize: 17,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0, 168, 107, 0.35)',
            }}
          >
            + Add Your First Plant
          </button>
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
