export interface WateringPlant {
  id: number;
  name: string;
  species: string | null;
  identifier: string | null;
  location: string | null;
  potSizeCm: number | null;
  waterAmountMl: number;
  waterDescription: string | null;
  fertilizerDue: boolean;
  watchFor: string | null;
  illustrationPath: string | null;
  calibration:
    | { questionText: string; scaleMinLabel: string; scaleMaxLabel: string }
    | { skip: true; reason: string };
}

export interface NextWatering {
  name: string;
  date: string;
  interval: number;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function renderCalibrationBox(calibration: WateringPlant['calibration']): string {
  if ('skip' in calibration && calibration.skip) {
    return `<div style="margin-top:auto;padding:6px 8px;background:#e8e3de;border-radius:4px;font-family:sans-serif;font-size:12px;color:#555;">Soil: dialed in ✓</div>`;
  }

  const cal = calibration as { questionText: string; scaleMinLabel: string; scaleMaxLabel: string };
  return `<div style="border:1px solid #888;border-radius:4px;padding:6px;margin-top:auto;">
      <div style="font-weight:bold;font-size:12px;font-family:sans-serif;">${cal.questionText}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;font-family:sans-serif;margin-top:4px;">
        <span>1 ${cal.scaleMinLabel}</span><span>2</span><span>3</span><span>4</span><span>5 ${cal.scaleMaxLabel}</span>
      </div>
      <div style="font-size:10px;color:#666;font-family:sans-serif;margin-top:2px;">Answer in app before 12:00</div>
    </div>`;
}

function renderPlantCard(plant: WateringPlant): string {
  const illustrationHtml = plant.illustrationPath
    ? `<div style="text-align:center;margin-bottom:8px;"><img src="${plant.illustrationPath}" style="max-height:160px;max-width:100%;" /></div>`
    : '';

  const identifierHtml = plant.identifier
    ? `<div style="font-size:14px;color:#333;">${plant.identifier}</div>`
    : '';

  const speciesHtml = plant.species
    ? `<div style="font-size:13px;font-style:italic;color:#555;">${plant.species}</div>`
    : '';

  const locationPotHtml = (plant.location || plant.potSizeCm !== null)
    ? `<div style="font-size:12px;color:#555;font-family:sans-serif;">${[plant.location, plant.potSizeCm !== null ? `${plant.potSizeCm}cm pot` : null].filter(Boolean).join(' · ')}</div>`
    : '';

  const watchForHtml = plant.watchFor
    ? `<div style="margin-top:4px;padding:3px 8px;background:#2a2a2a;color:#f5f0eb;border-radius:10px;font-family:sans-serif;font-size:11px;display:inline-block;">Watch for: ${plant.watchFor}</div>`
    : '';

  const calibrationHtml = renderCalibrationBox(plant.calibration);

  return `<div style="flex:1;max-width:380px;border:1.5px solid #2a2a2a;border-radius:8px;padding:10px;display:flex;flex-direction:column;">
    ${illustrationHtml}
    <div style="font-size:28px;font-weight:bold;line-height:1.1;">${plant.name}</div>
    ${identifierHtml}
    ${speciesHtml}
    ${locationPotHtml}
    <div style="margin-top:8px;font-family:sans-serif;font-size:14px;">
      <div><strong>Water:</strong> ${plant.waterAmountMl}ml</div>
      <div><strong>Fertilizer:</strong> ${plant.fertilizerDue ? 'Yes' : 'No'}</div>
      ${watchForHtml}
    </div>
    ${calibrationHtml}
  </div>`;
}

function renderFooter(nextWatering: NextWatering | null): string {
  if (!nextWatering) {
    return `<div style="border-top:1.5px solid #2a2a2a;padding:6px 16px;font-family:sans-serif;font-size:13px;color:#555;">No upcoming waterings</div>`;
  }
  return `<div style="border-top:1.5px solid #2a2a2a;padding:6px 16px;font-family:sans-serif;font-size:13px;color:#555;">
    Next: <strong style="color:#2a2a2a;">${nextWatering.name}</strong> — ${nextWatering.date} · every ${nextWatering.interval} days
  </div>`;
}

export function renderWateringDay(
  date: string,
  plants: WateringPlant[],
  nextWatering: NextWatering | null,
): string {
  const formattedDate = formatDate(date);
  const cardsHtml = plants.map(renderPlantCard).join('\n');

  return `<div style="width:800px;height:480px;background:#f5f0eb;font-family:Georgia,serif;display:flex;flex-direction:column;">
  <div style="background:#2a2a2a;color:#f5f0eb;padding:8px 16px;display:flex;justify-content:space-between;font-family:sans-serif;font-size:14px;">
    <span style="font-weight:bold;">Plant TRMNL</span>
    <span>${formattedDate}</span>
  </div>
  <div style="flex:1;display:flex;gap:12px;padding:12px;justify-content:center;">
    ${cardsHtml}
  </div>
  ${renderFooter(nextWatering)}
</div>`;
}
