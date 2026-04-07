import type { NextWatering } from './watering-day.js';

export interface OverduePlant {
  id: number;
  name: string;
  daysOverdue: number;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function renderOverdueBadge(overdue: OverduePlant[]): string {
  if (overdue.length === 0) return '';

  const first = overdue[0];
  const extra = overdue.length > 1 ? ` +${overdue.length - 1} more` : '';

  return `<div style="text-align:center;margin-bottom:8px;">
    <span style="background:#2a2a2a;color:#f5f0eb;padding:4px 12px;border-radius:12px;font-family:sans-serif;font-size:13px;">
      Overdue: ${first.name} (${first.daysOverdue} days)${extra}
    </span>
  </div>`;
}

function renderFooter(nextWatering: NextWatering | null): string {
  if (!nextWatering) {
    return `<div style="border-top:1.5px solid #2a2a2a;padding:6px 16px;font-family:sans-serif;font-size:13px;color:#555;">No upcoming waterings</div>`;
  }
  return `<div style="border-top:1.5px solid #2a2a2a;padding:6px 16px;display:flex;align-items:center;gap:8px;font-family:sans-serif;font-size:13px;color:#555;">
    <span style="text-transform:uppercase;font-size:11px;letter-spacing:1px;">Next Watering</span>
    <strong style="color:#2a2a2a;">${nextWatering.name}</strong> — ${nextWatering.date} · every ${nextWatering.interval} days
  </div>`;
}

export function renderRestDay(
  date: string,
  fact: { text: string },
  ornamentPath: string,
  nextWatering: NextWatering | null,
  overdue: OverduePlant[],
): string {
  const formattedDate = formatDate(date);
  const overdueBadgeHtml = renderOverdueBadge(overdue);

  return `<div style="width:800px;height:480px;background:#f5f0eb;font-family:Georgia,serif;display:flex;flex-direction:column;">
  <div style="background:#2a2a2a;color:#f5f0eb;padding:8px 16px;display:flex;justify-content:space-between;font-family:sans-serif;font-size:14px;">
    <span style="font-weight:bold;">Plant TRMNL</span>
    <span>${formattedDate}</span>
  </div>
  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;">
    <img src="${ornamentPath}" style="max-height:120px;margin-bottom:16px;" />
    <div style="font-size:24px;text-align:center;max-width:650px;line-height:1.3;">${fact.text}</div>
  </div>
  ${overdueBadgeHtml}
  ${renderFooter(nextWatering)}
</div>`;
}
