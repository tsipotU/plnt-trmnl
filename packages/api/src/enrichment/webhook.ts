import pino from 'pino';

const logger = pino({ name: 'enrichment.webhook' });

export async function fireEnrichmentWebhook(
  webhookUrl: string,
  plantId: number,
  plantData: {
    name: string;
    potSizeCm: number;
    plantSize: string;
    location: string;
    lightLevel: string;
  },
  callbackUrl: string
): Promise<boolean> {
  const body = {
    plant_id: plantId,
    plant_name: plantData.name,
    pot_size_cm: plantData.potSizeCm,
    plant_size: plantData.plantSize,
    location: plantData.location,
    light_level: plantData.lightLevel,
    callback_url: callbackUrl,
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      logger.info({ plantId, webhookUrl }, 'enrichment webhook fired successfully');
      return true;
    }

    logger.warn({ plantId, status: response.status }, 'enrichment webhook returned non-2xx');
    return false;
  } catch (err) {
    logger.error({ plantId, err }, 'enrichment webhook network error');
    return false;
  }
}
