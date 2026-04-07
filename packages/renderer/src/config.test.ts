import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadRendererConfig } from './config.js';

describe('loadRendererConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.API_INTERNAL_URL = 'http://plant-api:3900';
    process.env.RENDER_CRON = '0 * * * *';
    process.env.TRMNL_API_KEY = 'test-api-key';
    process.env.TRMNL_PLUGIN_UUID = 'test-plugin-uuid';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns valid config when all vars set', () => {
    process.env.PORT_RENDERER = '3901';

    const config = loadRendererConfig();
    expect(config.port).toBe(3901);
    expect(config.apiInternalUrl).toBe('http://plant-api:3900');
    expect(config.renderCron).toBe('0 * * * *');
    expect(config.trmnlApiKey).toBe('test-api-key');
    expect(config.trmnlPluginUuid).toBe('test-plugin-uuid');
  });

  it('throws when API_INTERNAL_URL missing', () => {
    delete process.env.API_INTERNAL_URL;
    expect(() => loadRendererConfig()).toThrow('API_INTERNAL_URL');
  });

  it('throws when TRMNL_API_KEY missing', () => {
    delete process.env.TRMNL_API_KEY;
    expect(() => loadRendererConfig()).toThrow('TRMNL_API_KEY');
  });

  it('throws when TRMNL_PLUGIN_UUID missing', () => {
    delete process.env.TRMNL_PLUGIN_UUID;
    expect(() => loadRendererConfig()).toThrow('TRMNL_PLUGIN_UUID');
  });

  it('defaults port to 3901', () => {
    delete process.env.PORT_RENDERER;
    const config = loadRendererConfig();
    expect(config.port).toBe(3901);
  });
});
