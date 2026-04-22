import { describe, it, expect } from 'vitest';
import { renderWateringDay } from './watering-day.js';
import type { WateringPlant, NextWatering } from './watering-day.js';

const calibrationQuestion = {
  questionText: 'How moist was the soil?',
  scaleMinLabel: 'bone dry',
  scaleMaxLabel: 'soaking wet',
};

const baseCalibrationSkip = { skip: true as const, reason: 'Dialed in after 8 waterings' };

const plant1: WateringPlant = {
  id: 1,
  name: 'Monstera',
  species: 'Monstera deliciosa',
  identifier: null,
  location: 'Living room',
  potSizeCm: 21,
  waterAmountMl: 400,
  waterDescription: 'Water until drains',
  fertilizerDue: true,
  watchFor: 'Yellow leaves',
  illustrationPath: '/illustrations/monstera.png',
  calibration: calibrationQuestion,
};

const plant2: WateringPlant = {
  id: 2,
  name: 'Ficus',
  species: 'Ficus lyrata',
  identifier: 'by the window',
  location: 'Bedroom',
  potSizeCm: 17,
  waterAmountMl: 250,
  waterDescription: null,
  fertilizerDue: false,
  watchFor: null,
  illustrationPath: '/illustrations/ficus.png',
  calibration: baseCalibrationSkip,
};

const nextWatering: NextWatering = {
  name: 'Pothos',
  date: '2026-04-09',
  interval: 7,
};

describe('renderWateringDay', () => {
  it('renders 1-plant layout with all key info', () => {
    const html = renderWateringDay('2026-04-07', [plant1], nextWatering);

    expect(html).toContain('Monstera');
    expect(html).toContain('400ml');
    expect(html).toContain('Monstera deliciosa');
    expect(html).toContain('How moist was the soil?');
    expect(html).toContain('bone dry');
    expect(html).toContain('soaking wet');
    expect(html).toContain('Answer in app before 12:00');
  });

  it('renders 2-plant layout with both plant names', () => {
    const html = renderWateringDay('2026-04-07', [plant1, plant2], nextWatering);

    expect(html).toContain('Monstera');
    expect(html).toContain('Ficus');
  });

  it('shows "dialed in" for converged plant (calibration skipped)', () => {
    const html = renderWateringDay('2026-04-07', [plant2], nextWatering);

    expect(html).toContain('dialed in');
    expect(html).not.toContain('Answer in app before 12:00');
  });

  it('renders gracefully when species is null', () => {
    const plantNoSpecies: WateringPlant = { ...plant1, species: null };
    const html = renderWateringDay('2026-04-07', [plantNoSpecies], nextWatering);

    expect(html).not.toContain('>null<');
    expect(html).not.toContain('"null"');
    expect(html).toContain('Monstera');
  });

  it('handles no next watering gracefully', () => {
    const html = renderWateringDay('2026-04-07', [plant1], null);

    expect(html).toContain('No upcoming waterings');
  });

  it('output is valid HTML structure', () => {
    const html = renderWateringDay('2026-04-07', [plant1], nextWatering);

    expect(html.trimStart()).toMatch(/^<div/);
    expect(html).toContain('Plant TRMNL');
    expect(html).toContain('800px');
    expect(html).toContain('480px');
  });

  it('shows fertilizer Yes when due', () => {
    const html = renderWateringDay('2026-04-07', [plant1], nextWatering);

    expect(html).toContain('Yes');
  });

  it('shows fertilizer No when not due', () => {
    const html = renderWateringDay('2026-04-07', [plant2], nextWatering);

    expect(html).toContain('No');
  });

  it('shows watchFor badge when present', () => {
    const html = renderWateringDay('2026-04-07', [plant1], nextWatering);

    expect(html).toContain('Yellow leaves');
    expect(html).toContain('Watch for');
  });

  it('shows no watchFor badge when null', () => {
    const html = renderWateringDay('2026-04-07', [plant2], nextWatering);

    expect(html).not.toContain('Watch for');
  });

  it('shows next watering footer with name, date and interval', () => {
    const html = renderWateringDay('2026-04-07', [plant1], nextWatering);

    expect(html).toContain('Pothos');
    expect(html).toContain('2026-04-09');
    expect(html).toContain('7');
  });

  it('renders illustration image when path provided', () => {
    const html = renderWateringDay('2026-04-07', [plant1], nextWatering);

    expect(html).toContain('/illustrations/monstera.png');
  });

  it('renders pot size and location', () => {
    const html = renderWateringDay('2026-04-07', [plant1], nextWatering);

    expect(html).toContain('21cm');
    expect(html).toContain('Living room');
  });

  it('renders identifier as subtitle under name when set', () => {
    const html = renderWateringDay('2026-04-07', [plant2], nextWatering);

    expect(html).toContain('by the window');
  });

  it('omits identifier when null', () => {
    const html = renderWateringDay('2026-04-07', [plant1], nextWatering);

    expect(html).not.toMatch(/>null</);
  });
});
