import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface PushResult {
  success: boolean;
  status?: number;
  error?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load the Liquid template once at startup
let liquidTemplate: string;
try {
  liquidTemplate = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'docs', 'trmnl-templates', 'full-view.liquid'),
    'utf-8'
  );
} catch {
  // Fallback for Docker where repo structure differs
  liquidTemplate = '{{ fact_text }}';
}

export async function pushToTrmnl(
  mergeVariables: Record<string, unknown>,
  apiKey: string,
  pluginUuid: string,
): Promise<PushResult> {
  const url = `https://usetrmnl.com/api/custom_plugins/${pluginUuid}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merge_variables: mergeVariables,
        markup: liquidTemplate,
      }),
    });

    if (response.ok) {
      return { success: true, status: response.status };
    }

    return { success: false, status: response.status };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}
