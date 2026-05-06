import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlantDetailHero, type PlantDetailHeroPlant } from './PlantDetailHero';

function makePlant(over: Partial<PlantDetailHeroPlant> = {}): PlantDetailHeroPlant {
  return {
    id: 1,
    name: 'Mona',
    species: 'Monstera deliciosa',
    common_name: null,
    identifier: null,
    illustration_path: 'monstera.png',
    location: 'Living room',
    next_water_date: null,
    last_watered_at: null,
    current_interval: 7,
    is_converged: 1,
    enrichment_status: 'complete',
    archived: 0,
    ...over,
  };
}

const noop = vi.fn();

describe('PlantDetailHero — image lightbox (#162)', () => {
  it('shows an enlarge button when illustration_path is set', () => {
    render(
      <PlantDetailHero
        plant={makePlant()}
        onSaveName={noop}
        onSaveIdentifier={noop}
        onSaveSpecies={noop}
      />,
    );
    expect(screen.getByRole('button', { name: /enlarge plant image/i })).toBeInTheDocument();
  });

  it('does not show an enlarge button without an illustration', () => {
    render(
      <PlantDetailHero
        plant={makePlant({ illustration_path: null })}
        onSaveName={noop}
        onSaveIdentifier={noop}
        onSaveSpecies={noop}
      />,
    );
    expect(screen.queryByRole('button', { name: /enlarge plant image/i })).not.toBeInTheDocument();
  });

  it('opens the lightbox dialog when the enlarge button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <PlantDetailHero
        plant={makePlant()}
        onSaveName={noop}
        onSaveIdentifier={noop}
        onSaveSpecies={noop}
      />,
    );
    expect(screen.queryByRole('dialog', { name: /enlarged plant image/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /enlarge plant image/i }));
    expect(screen.getByRole('dialog', { name: /enlarged plant image/i })).toBeInTheDocument();
  });

  it('closes the lightbox when the close button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <PlantDetailHero
        plant={makePlant()}
        onSaveName={noop}
        onSaveIdentifier={noop}
        onSaveSpecies={noop}
      />,
    );
    await user.click(screen.getByRole('button', { name: /enlarge plant image/i }));
    await user.click(screen.getByRole('button', { name: /close enlarged image/i }));
    expect(screen.queryByRole('dialog', { name: /enlarged plant image/i })).not.toBeInTheDocument();
  });

  it('closes the lightbox when Escape is pressed', async () => {
    const user = userEvent.setup();
    render(
      <PlantDetailHero
        plant={makePlant()}
        onSaveName={noop}
        onSaveIdentifier={noop}
        onSaveSpecies={noop}
      />,
    );
    await user.click(screen.getByRole('button', { name: /enlarge plant image/i }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /enlarged plant image/i })).not.toBeInTheDocument();
  });
});
