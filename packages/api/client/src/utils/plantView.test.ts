import { describe, it, expect } from 'vitest';
import type { Plant } from '../components/PlantCard';
import { plantState } from './plantView';

function plant(over: Partial<Plant> = {}): Plant {
  return {
    id: 1,
    name: 'Mona',
    species: null,
    common_name: null,
    location: null,
    pot_size_cm: null,
    pot_size_category: null,
    plant_size: null,
    light_level: null,
    water_ratio: null,
    water_description: null,
    base_interval: null,
    current_interval: 7,
    next_water_date: null,
    last_watered_at: null,
    is_converged: 1,
    enrichment_status: 'complete',
    archived: 0,
    archived_at: null,
    ...over,
  } as Plant;
}

describe('plantState — humanized labels (#167)', () => {
  const TODAY = '2026-05-06';

  describe('watered today wins over everything', () => {
    it('shows "Watered" when last_watered_at matches today', () => {
      const p = plant({ last_watered_at: TODAY + 'T08:00:00Z', next_water_date: TODAY });
      expect(plantState(p, TODAY)).toEqual({ tone: 'healthy', label: 'Watered' });
    });
  });

  describe('due today', () => {
    it('shows "today" with due tone', () => {
      const p = plant({ next_water_date: TODAY });
      expect(plantState(p, TODAY)).toEqual({ tone: 'due', label: 'today' });
    });
  });

  describe('overdue uses humanized past form', () => {
    it.each([
      ['2026-05-05', 'yesterday'],          //  -1
      ['2026-05-04', 'a few days ago'],     //  -2
      ['2026-05-03', 'a few days ago'],     //  -3
      ['2026-05-02', 'about a week ago'],   //  -4
      ['2026-04-29', 'about a week ago'],   //  -7
      ['2026-04-28', 'over a week ago'],    //  -8
      ['2026-04-22', 'over a week ago'],    // -14
    ])('next_water_date=%s → "%s"', (next, expected) => {
      const p = plant({ next_water_date: next });
      const r = plantState(p, TODAY);
      expect(r.tone).toBe('overdue');
      expect(r.label).toBe(expected);
    });

    it('past 14 days falls back to a short date label', () => {
      const p = plant({ next_water_date: '2026-04-06' }); // -30
      const r = plantState(p, TODAY);
      expect(r.tone).toBe('overdue');
      expect(r.label).toBe('Apr 6');
    });
  });

  describe('future (healthy) uses humanized future form', () => {
    it.each([
      ['2026-05-07', 'tomorrow'],
      ['2026-05-08', 'in a few days'],
      ['2026-05-13', 'in about a week'],
      ['2026-05-20', 'in over a week'],
    ])('next_water_date=%s → "%s"', (next, expected) => {
      const p = plant({ next_water_date: next });
      const r = plantState(p, TODAY);
      expect(r.tone).toBe('healthy');
      expect(r.label).toBe(expected);
    });

    it('beyond 14 days falls back to a short date label', () => {
      const p = plant({ next_water_date: '2026-05-26' }); // +20
      const r = plantState(p, TODAY);
      expect(r.tone).toBe('healthy');
      expect(r.label).toBe('May 26');
    });
  });

  describe('special states still trump time labels', () => {
    it('enrichment_status=pending shows "New"', () => {
      const p = plant({ enrichment_status: 'pending', next_water_date: '2026-05-13' });
      expect(plantState(p, TODAY)).toEqual({ tone: 'just-added', label: 'New' });
    });

    it('not yet converged shows "Calibrating"', () => {
      const p = plant({ is_converged: 0, current_interval: 7 });
      expect(plantState(p, TODAY)).toEqual({ tone: 'calibrating', label: 'Calibrating' });
    });

    it('no next_water_date shows "Comfortable"', () => {
      const p = plant({ next_water_date: null });
      expect(plantState(p, TODAY)).toEqual({ tone: 'healthy', label: 'Comfortable' });
    });
  });
});
