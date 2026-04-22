export type ArchiveReason = 'died' | 'gave_away' | 'moved' | 'other';

export function formatDuration(createdAt: string, archivedAt: string): string {
  const start = new Date(createdAt);
  const end = new Date(archivedAt);
  const months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth());

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
