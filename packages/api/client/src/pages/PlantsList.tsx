import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Plant } from '../components/PlantCard.js';
import { PageHead } from '../components/molecules/PageHead/PageHead.js';
import { SearchBar } from '../components/molecules/SearchBar/SearchBar.js';
import { FilterRail } from '../components/molecules/FilterRail/FilterRail.js';
import { PlantRow } from '../components/molecules/PlantRow/PlantRow.js';
import { EmptyState } from '../components/molecules/EmptyState/EmptyState.js';
import { Banner } from '../components/atoms/Banner/Banner.js';
import { Button } from '../components/atoms/Button/Button.js';
import { Chip } from '../components/atoms/Chip/Chip.js';
import { RowState } from '../components/atoms/RowState/RowState.js';
import { Pictogram } from '../components/atoms/Pictogram/Pictogram.js';
import {
  plantState,
  plantPictogram,
  plantMeta,
  plantSpeciesLine,
  isoToday,
} from '../utils/plantView.js';
import './PlantsList.css';

/* === Filter spec ========================================================
 *
 * v1.0 ships only "All" and "Due". The category rail is parked for v1.1 —
 * see issue #148. Showing chips with no data behind them looked broken;
 * two chips look intentional.
 */

type StateFilter = 'all' | 'due';

const STATE_FILTERS: ReadonlyArray<{ id: StateFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'due', label: 'Due' },
];

function matchesState(p: Plant, today: string, filter: StateFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'due') {
    return p.next_water_date != null && p.next_water_date <= today;
  }
  return true;
}

function matchesQuery(p: Plant, q: string): boolean {
  if (!q) return true;
  const haystack = [p.name, p.species ?? '', p.common_name ?? '', p.location ?? '']
    .join(' ')
    .toLowerCase();
  return haystack.includes(q.toLowerCase());
}

/* === Page =============================================================== */

export function PlantsList() {
  const navigate = useNavigate();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');

  const loadPlants = useCallback(() => {
    return fetch('/api/plants')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch plants');
        return r.json();
      })
      .then((data: Plant[]) => setPlants(data))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  useEffect(() => {
    loadPlants().finally(() => setLoading(false));
  }, [loadPlants]);

  const today = isoToday();

  const active = useMemo(() => plants.filter((p) => p.archived === 0), [plants]);

  const visible = useMemo(
    () =>
      active.filter((p) => matchesState(p, today, stateFilter) && matchesQuery(p, q)),
    [active, today, stateFilter, q],
  );

  function renderRow(p: Plant) {
    const state = plantState(p, today);
    return (
      <PlantRow
        key={p.id}
        pictogram={<Pictogram name={plantPictogram(p)} size={28} />}
        name={p.name}
        species={plantSpeciesLine(p)}
        meta={plantMeta(p)}
        state={<RowState tone={state.tone}>{state.label}</RowState>}
        onClick={() => navigate(`/plants/${p.id}`)}
      />
    );
  }

  return (
    <div className="p7l-plants">
      {loading && <EmptyState>Loading plants…</EmptyState>}

      {error && !loading && (
        <Banner tone="error" title="Couldn't load plants">
          {error}
        </Banner>
      )}

      {!loading && !error && plants.length === 0 && (
        <EmptyState
          action={
            <Button variant="primary" size="lg" onClick={() => navigate('/add')}>
              + Add your first plant
            </Button>
          }
        >
          Nothing in the registry yet.
        </EmptyState>
      )}

      {!loading && !error && plants.length > 0 && (
        <>
          <PageHead
            eyebrow={`Registry · ${active.length} active`}
            title="Plants"
          />

          <SearchBar
            value={q}
            onChange={setQ}
            placeholder="Search by name, species, room…"
            iconLeading={<Pictogram name="search" size={16} />}
          />

          <FilterRail compact>
            {STATE_FILTERS.map((f) => (
              <Chip
                key={f.id}
                toggleable
                active={stateFilter === f.id}
                onClick={() => setStateFilter(f.id)}
              >
                {f.label}
              </Chip>
            ))}
          </FilterRail>

          {visible.length === 0 ? (
            <EmptyState>No plants match.</EmptyState>
          ) : (
            visible.map(renderRow)
          )}

          {/* Spacer so the FAB doesn't overlap the last list row */}
          <div style={{ height: 96 }} />
        </>
      )}

      {plants.length > 0 && (
        <Link to="/add" aria-label="Add plant" className="p7l-plants__fab">
          +
        </Link>
      )}
    </div>
  );
}
