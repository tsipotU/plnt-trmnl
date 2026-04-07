export interface RendererConfig {
  port: number;
  apiInternalUrl: string;
  renderCron: string;
  trmnlApiKey: string;
  trmnlPluginUuid: string;
}

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export function loadRendererConfig(): RendererConfig {
  return {
    port: parseInt(process.env.PORT_RENDERER || '3901', 10),
    apiInternalUrl: required('API_INTERNAL_URL'),
    renderCron: required('RENDER_CRON'),
    trmnlApiKey: required('TRMNL_API_KEY'),
    trmnlPluginUuid: required('TRMNL_PLUGIN_UUID'),
  };
}
