import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEnrichmentWebhook } from './webhook.js';

describe('fireEnrichmentWebhook', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs to the webhook URL with correct body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', mockFetch);

    await fireEnrichmentWebhook(
      'https://n8n.example.com/webhook/enrich',
      1,
      {
        name: 'Monstera',
        potSizeCm: 25,
        plantSize: 'large',
        location: 'living room',
        lightLevel: 'bright_indirect',
      },
      'http://plant-api:3900/api/enrichment/callback'
    );

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://n8n.example.com/webhook/enrich');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body).toEqual({
      plant_id: 1,
      plant_name: 'Monstera',
      pot_size_cm: 25,
      plant_size: 'large',
      location: 'living room',
      light_level: 'bright_indirect',
      callback_url: 'http://plant-api:3900/api/enrichment/callback',
    });
  });

  it('returns true on 200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));

    const result = await fireEnrichmentWebhook(
      'https://n8n.example.com/webhook/enrich',
      1,
      { name: 'Monstera', potSizeCm: 25, plantSize: 'large', location: 'living room', lightLevel: 'bright_indirect' },
      'http://plant-api:3900/api/enrichment/callback'
    );

    expect(result).toBe(true);
  });

  it('returns true on any 2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 202 }));

    const result = await fireEnrichmentWebhook(
      'https://n8n.example.com/webhook/enrich',
      2,
      { name: 'Fern', potSizeCm: 12, plantSize: 'small', location: 'bathroom', lightLevel: 'low' },
      'http://plant-api:3900/api/enrichment/callback'
    );

    expect(result).toBe(true);
  });

  it('returns false on non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const result = await fireEnrichmentWebhook(
      'https://n8n.example.com/webhook/enrich',
      3,
      { name: 'Cactus', potSizeCm: 8, plantSize: 'small', location: 'windowsill', lightLevel: 'direct' },
      'http://plant-api:3900/api/enrichment/callback'
    );

    expect(result).toBe(false);
  });

  it('returns false on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await fireEnrichmentWebhook(
      'https://n8n.example.com/webhook/enrich',
      4,
      { name: 'Basil', potSizeCm: 10, plantSize: 'small', location: 'kitchen', lightLevel: 'medium' },
      'http://plant-api:3900/api/enrichment/callback'
    );

    expect(result).toBe(false);
  });
});
