export interface PushResult {
  success: boolean;
  status?: number;
  error?: string;
}

export async function pushToTrmnl(
  markup: string,
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
      body: JSON.stringify({ merge_variables: { markup } }),
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
