import { useEffect, useState } from 'react';

/**
 * Returns whether an external AI tool has recently completed enrichment for any
 * plant. Used by UI surfaces (PlantCard, PlantDetail) to suppress stale
 * "✨ Enrichment pending" indicators when the user hasn't connected an AI tool
 * — under the pull-based model, a pending plant only resolves once an AI tool
 * polls and POSTs back, so without one connected the badge would be permanent.
 *
 * Heuristic: at least one `enrichment_complete` event in the last 7 days.
 * Backed by GET /api/system/ai-connection.
 *
 * Fail-safe: on fetch error, default to `connected: true` so the absence of
 * the banner is preferred over showing it to a real user with a real AI tool
 * (a transient network blip shouldn't make every plant card sprout warnings).
 */
export function useAiConnection(): { connected: boolean; loading: boolean } {
  const [state, setState] = useState<{ connected: boolean; loading: boolean }>({
    connected: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/system/ai-connection')
      .then((r) => (r.ok ? r.json() : { connected: true }))
      .then((data) => {
        if (cancelled) return;
        setState({ connected: !!data.connected, loading: false });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ connected: true, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
