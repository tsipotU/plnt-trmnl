import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pushToTrmnl } from './push.js';

describe('pushToTrmnl', () => {
  const PLUGIN_UUID = 'test-uuid-1234';
  const API_KEY = 'test-api-key';
  const MERGE_VARS = { fact_text: 'Plants lean toward light', p1_name: 'Pothos' };
  const EXPECTED_URL = `https://usetrmnl.com/api/custom_plugins/${PLUGIN_UUID}`;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls fetch with correct URL, headers, and body shape', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await pushToTrmnl(MERGE_VARS, API_KEY, PLUGIN_UUID);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];

    expect(url).toBe(EXPECTED_URL);
    expect(options.method).toBe('POST');

    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${API_KEY}`);
    expect(headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body as string);
    expect(body.merge_variables).toEqual(MERGE_VARS);
    expect(typeof body.markup).toBe('string');
  });

  it('returns success:true on 200', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }));

    const result = await pushToTrmnl(MERGE_VARS, API_KEY, PLUGIN_UUID);

    expect(result.success).toBe(true);
    expect(result.status).toBe(200);
    expect(result.error).toBeUndefined();
  });

  it('returns success:false with status on 4xx', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

    const result = await pushToTrmnl(MERGE_VARS, API_KEY, PLUGIN_UUID);

    expect(result.success).toBe(false);
    expect(result.status).toBe(401);
  });

  it('returns success:false with status on 5xx', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

    const result = await pushToTrmnl(MERGE_VARS, API_KEY, PLUGIN_UUID);

    expect(result.success).toBe(false);
    expect(result.status).toBe(500);
  });

  it('returns success:false with error message on network failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network unreachable'));

    const result = await pushToTrmnl(MERGE_VARS, API_KEY, PLUGIN_UUID);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network unreachable');
    expect(result.status).toBeUndefined();
  });

  it('returns success:false with generic error for non-Error throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce('string error');

    const result = await pushToTrmnl(MERGE_VARS, API_KEY, PLUGIN_UUID);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
