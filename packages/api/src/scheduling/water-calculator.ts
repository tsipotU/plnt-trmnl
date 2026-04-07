export interface MonthDay {
  month: number;
  day: number;
}

interface WaterCalcInput {
  potSizeCm: number;
  waterRatio: number;
  isHeatingSeason: boolean;
  heatingSeasonModifier: number;
}

export function calculateWaterAmount(input: WaterCalcInput): number {
  const { potSizeCm, waterRatio, isHeatingSeason, heatingSeasonModifier } = input;
  const radiusCm = potSizeCm / 2;
  const depthCm = potSizeCm * 0.85; // standard nursery pot proportions
  const potVolumeMl = Math.PI * radiusCm * radiusCm * depthCm;
  const seasonModifier = isHeatingSeason ? heatingSeasonModifier : 1.0;
  return Math.round(potVolumeMl * waterRatio * seasonModifier);
}

export function isHeatingSeasonActive(date: Date, start: MonthDay, end: MonthDay): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  // Heating season wraps around year end (Oct 1 – Apr 1)
  if (start.month > end.month) {
    if (month > start.month || (month === start.month && day >= start.day)) return true;
    if (month < end.month || (month === end.month && day < end.day)) return true;
    return false;
  }
  if (month > start.month && month < end.month) return true;
  if (month === start.month && day >= start.day) return true;
  if (month === end.month && day < end.day) return true;
  return false;
}
