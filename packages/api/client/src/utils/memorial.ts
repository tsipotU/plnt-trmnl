import type { ArchiveReason as _ArchiveReason } from '../components/ArchiveDialog';

export type ArchiveReason = _ArchiveReason;

function toIsoDate(input: string): string {
  // Already fully ISO with Z or TZ offset
  if (input.includes('T') && (input.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(input))) {
    return input;
  }
  // SQLite "YYYY-MM-DD HH:mm:ss" → "YYYY-MM-DDTHH:mm:ssZ"
  if (input.includes(' ')) {
    return input.replace(' ', 'T') + 'Z';
  }
  // "YYYY-MM-DDTHH:mm:ss" (no TZ) → append Z
  if (input.includes('T')) {
    return input + 'Z';
  }
  // Plain "YYYY-MM-DD" — Date parses as UTC midnight, no change needed
  return input;
}

export function formatDuration(createdAt: string, archivedAt: string): string {
  const start = new Date(toIsoDate(createdAt));
  const end = new Date(toIsoDate(archivedAt));
  const months = Math.max(
    0,
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      (end.getUTCMonth() - start.getUTCMonth())
  );

  if (months < 12) {
    return `${months} month${months === 1 ? '' : 's'}`;
  }
  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? '' : 's'}`;
}

export interface MemorialInput {
  name: string;
  reason: ArchiveReason;
  createdAt: string;
  archivedAt: string;
}

export function buildMemorialMessage(input: MemorialInput): string {
  const duration = formatDuration(input.createdAt, input.archivedAt);
  switch (input.reason) {
    case 'died':
      return `${input.name} was in your care for ${duration}. Rest well. 🌿`;
    case 'gave_away':
      return `${input.name} found a new home after ${duration}. 🌱`;
    case 'moved':
      return `${input.name} is on its way to a new spot. ${duration} of memories. 🌿`;
    case 'other':
      return `${input.name} was with you for ${duration}.`;
  }
}
