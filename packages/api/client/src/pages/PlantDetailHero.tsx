import { useState } from 'react';
import { Pictogram } from '../components/atoms/Pictogram/Pictogram.js';
import { RowState } from '../components/atoms/RowState/RowState.js';
import { plantState, type PlantStateInfo, isoToday } from '../utils/plantView.js';
import './PlantDetailHero.css';

/* Page-local hero block for Plant detail. Replaces the existing three-card
   stack (illustration · duplicate hero · name/species/identifier) with a
   single horizontal block per the prototype.
   Stays page-local; promotion to a molecule will be considered when
   Memorial PR rebuilds the same shape. */

export interface PlantDetailHeroPlant {
  id: number;
  name: string;
  species: string | null;
  common_name: string | null;
  identifier: string | null;
  illustration_path: string | null;
  location: string | null;
  next_water_date: string | null;
  last_watered_at: string | null;
  current_interval: number | null;
  is_converged: number | null;
  enrichment_status?: string | null;
  archived: number;
}

interface PlantDetailHeroProps {
  plant: PlantDetailHeroPlant;
  onSaveName: (name: string) => Promise<void> | void;
  onSaveIdentifier: (identifier: string | null) => Promise<void> | void;
  onSaveSpecies: (species: string) => Promise<void> | void;
}

function buildState(p: PlantDetailHeroPlant): PlantStateInfo {
  return plantState(
    {
      id: p.id,
      name: p.name,
      common_name: p.common_name,
      species: p.species,
      identifier: p.identifier,
      pot_size_cm: null,
      plant_size: null,
      location: p.location,
      light_level: null,
      illustration_path: p.illustration_path,
      next_water_date: p.next_water_date,
      last_watered_at: p.last_watered_at,
      enrichment_status: (p.enrichment_status ?? 'complete') as 'pending' | 'complete' | 'failed',
      archived: p.archived,
      is_converged: p.is_converged ?? undefined,
      current_interval: p.current_interval ?? undefined,
    },
    isoToday(),
  );
}

export function PlantDetailHero({
  plant,
  onSaveName,
  onSaveIdentifier,
  onSaveSpecies,
}: PlantDetailHeroProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(plant.name);
  const [editingSpecies, setEditingSpecies] = useState(false);
  const [speciesDraft, setSpeciesDraft] = useState(plant.species ?? '');
  const [editingIdentifier, setEditingIdentifier] = useState(false);
  const [identifierDraft, setIdentifierDraft] = useState(plant.identifier ?? '');

  const state = buildState(plant);

  function commitName() {
    const next = nameDraft.trim();
    if (!next || next === plant.name) {
      setEditingName(false);
      setNameDraft(plant.name);
      return;
    }
    Promise.resolve(onSaveName(next))
      .catch(() => setNameDraft(plant.name))
      .finally(() => setEditingName(false));
  }

  function commitSpecies() {
    const next = speciesDraft.trim();
    if (!next || next === (plant.species ?? '')) {
      setEditingSpecies(false);
      setSpeciesDraft(plant.species ?? '');
      return;
    }
    Promise.resolve(onSaveSpecies(next))
      .catch(() => setSpeciesDraft(plant.species ?? ''))
      .finally(() => setEditingSpecies(false));
  }

  function commitIdentifier() {
    const trimmed = identifierDraft.trim();
    const next = trimmed === '' ? null : trimmed;
    if (next === plant.identifier) {
      setEditingIdentifier(false);
      return;
    }
    Promise.resolve(onSaveIdentifier(next))
      .catch(() => setIdentifierDraft(plant.identifier ?? ''))
      .finally(() => setEditingIdentifier(false));
  }

  return (
    <header className="p7l-pdhero">
      <div className="p7l-pdhero__pic">
        {plant.illustration_path ? (
          <img
            src={`/api/illustrations/${encodeURIComponent(plant.illustration_path)}`}
            alt={plant.species ?? plant.name}
            loading="lazy"
          />
        ) : (
          <Pictogram name="leaf" size={64} stroke={1.4} />
        )}
      </div>
      <div className="p7l-pdhero__body">
        {editingName ? (
          <input
            autoFocus
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName();
              if (e.key === 'Escape') {
                setEditingName(false);
                setNameDraft(plant.name);
              }
            }}
            className="p7l-pdhero__name-input"
            aria-label="Plant name"
          />
        ) : (
          <button
            type="button"
            className="p7l-pdhero__name"
            onClick={() => {
              setNameDraft(plant.name);
              setEditingName(true);
            }}
          >
            {plant.name}
          </button>
        )}

        {editingSpecies ? (
          <div className="p7l-pdhero__species-edit">
            <input
              autoFocus
              type="text"
              value={speciesDraft}
              onChange={(e) => setSpeciesDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitSpecies();
                if (e.key === 'Escape') {
                  setEditingSpecies(false);
                  setSpeciesDraft(plant.species ?? '');
                }
              }}
              placeholder="Latin or common name"
              aria-label="Species"
            />
          </div>
        ) : plant.species ? (
          <button
            type="button"
            className="p7l-pdhero__species"
            data-testid="plant-species"
            onClick={() => {
              setSpeciesDraft(plant.species ?? '');
              setEditingSpecies(true);
            }}
          >
            <span className="p7l-pdhero__species-text">{plant.species}</span>
            <span className="p7l-pdhero__species-rename">Not this? Rename →</span>
          </button>
        ) : (
          <button
            type="button"
            className="p7l-pdhero__species-add"
            onClick={() => {
              setSpeciesDraft('');
              setEditingSpecies(true);
            }}
          >
            + Set species
          </button>
        )}

        {plant.common_name && plant.common_name !== plant.species && (
          <span className="p7l-pdhero__common">{plant.common_name}</span>
        )}

        {editingIdentifier ? (
          <input
            autoFocus
            type="text"
            value={identifierDraft}
            onChange={(e) => setIdentifierDraft(e.target.value)}
            onBlur={commitIdentifier}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitIdentifier();
              if (e.key === 'Escape') {
                setEditingIdentifier(false);
                setIdentifierDraft(plant.identifier ?? '');
              }
            }}
            placeholder="Add identifier (e.g. blue pot)"
            className="p7l-pdhero__identifier-input"
            aria-label="Identifier"
          />
        ) : (
          <button
            type="button"
            className="p7l-pdhero__identifier"
            onClick={() => {
              setIdentifierDraft(plant.identifier ?? '');
              setEditingIdentifier(true);
            }}
          >
            {plant.identifier ? `"${plant.identifier}"` : '+ Add identifier'}
          </button>
        )}

        <div className="p7l-pdhero__state">
          <RowState tone={state.tone}>{state.label}</RowState>
        </div>
      </div>
    </header>
  );
}
