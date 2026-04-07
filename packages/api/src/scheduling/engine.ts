export function calculateNextWaterDate(lastWateredAt: string, intervalDays: number): string {
  const [year, month, day] = lastWateredAt.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + intervalDays);
  return d.toISOString().split('T')[0];
}

function potVolume(sizeCm: number): number {
  const r = sizeCm / 2;
  const depth = sizeCm * 0.85;
  return Math.PI * r * r * depth;
}

export function calculateRepotAdjustment(
  currentInterval: number,
  oldPotSizeCm: number,
  newPotSizeCm: number
): number {
  const ratio = potVolume(newPotSizeCm) / potVolume(oldPotSizeCm);
  const adjusted = Math.round(currentInterval * Math.pow(ratio, 0.3));
  return Math.max(adjusted, 2);
}

export function isFertilizerDue(
  lastFertilizedAt: string | null,
  intervalWeeks: number,
  today: Date,
  isHeatingSeason: boolean
): boolean {
  if (isHeatingSeason) return false;
  if (!lastFertilizedAt) return true;
  const last = new Date(lastFertilizedAt + 'T00:00:00');
  const diffMs = today.getTime() - last.getTime();
  const diffWeeks = diffMs / (7 * 24 * 60 * 60 * 1000);
  return diffWeeks >= intervalWeeks;
}
