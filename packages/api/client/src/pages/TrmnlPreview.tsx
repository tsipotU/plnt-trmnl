import { useState, useEffect } from 'react';

// Proxy through API to avoid CORS issues
const RENDERER_URL = '/api/trmnl';

export function TrmnlPreview() {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  async function fetchPreview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${RENDERER_URL}/preview`);
      if (!res.ok) throw new Error(`Renderer returned ${res.status}`);
      const text = await res.text();
      setHtml(text);
      setLastRefreshed(new Date());
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError(
          'Cannot reach the renderer (localhost:3901). Make sure Docker Compose is running.'
        );
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load preview');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`${RENDERER_URL}/render`, { method: 'POST' });
      if (!res.ok) throw new Error(`Render trigger returned ${res.status}`);
      // Give the renderer a moment to generate the new preview
      await new Promise((r) => setTimeout(r, 1500));
      await fetchPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger render');
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchPreview();
  }, []);

  // Scale: TRMNL display is 800x480, we want it to fit ~393px wide
  const scale = 0.49;
  const displayW = 800;
  const displayH = 480;

  return (
    <div>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>TRMNL Preview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Updated daily at 05:00
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          style={{
            background: refreshing || loading ? 'rgba(0,168,107,0.4)' : 'var(--accent)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            padding: '10px 16px',
            borderRadius: 8,
            minHeight: 44,
            cursor: refreshing || loading ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {refreshing ? 'Rendering...' : '↻ Refresh'}
        </button>
      </div>

      {/* Last refreshed */}
      {lastRefreshed && !loading && !error && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Last fetched:{' '}
          {lastRefreshed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      {/* Error */}
      {error && (
        <div
          className="card"
          style={{
            background: 'rgba(231, 76, 60, 0.1)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            marginBottom: 16,
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Preview unavailable</p>
          <p style={{ fontSize: 13, opacity: 0.9 }}>{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div
          style={{
            width: Math.round(displayW * scale),
            height: Math.round(displayH * scale),
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            fontSize: 14,
          }}
        >
          Loading preview...
        </div>
      )}

      {/* iframe preview */}
      {html && !loading && (
        <div
          style={{
            // Outer container sized to the scaled-down dimensions so it
            // doesn't push page layout.
            width: Math.round(displayW * scale),
            height: Math.round(displayH * scale),
            overflow: 'hidden',
            borderRadius: 4,
            position: 'relative',
          }}
        >
          <iframe
            srcDoc={html}
            title="TRMNL display preview"
            scrolling="no"
            style={{
              width: displayW,
              height: displayH,
              border: '1px solid var(--border)',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              background: '#fff',
            }}
          />
        </div>
      )}

      {/* Info footer */}
      <div className="card" style={{ marginTop: 20, background: 'var(--bg-secondary)' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          The preview shows the HTML template rendered by the plant-renderer container.
          The actual TRMNL display fetches a screenshot image from the renderer on its own
          schedule. Use Refresh to trigger an immediate re-render.
        </p>
      </div>
    </div>
  );
}
