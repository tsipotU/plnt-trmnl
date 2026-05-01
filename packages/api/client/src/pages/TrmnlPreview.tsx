import { useState, useEffect } from 'react';
import { PageHead } from '../components/molecules/PageHead/PageHead';
import { InfoCard } from '../components/molecules/InfoCard/InfoCard';
import { Button } from '../components/atoms/Button/Button';
import { Banner } from '../components/atoms/Banner/Banner';
import './TrmnlPreview.css';

const RENDERER_URL = '/api/trmnl';

const DISPLAY_W = 800;
const DISPLAY_H = 480;
const SCALE = 0.49;

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
        setError('Cannot reach the renderer (localhost:3901). Make sure Docker Compose is running.');
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

  const stageW = Math.round(DISPLAY_W * SCALE);
  const stageH = Math.round(DISPLAY_H * SCALE);

  return (
    <div className="p7l-trmnl-preview">
      <PageHead
        eyebrow={
          lastRefreshed
            ? `Last fetched ${lastRefreshed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
            : 'Updated daily at 05:00'
        }
        title="TRMNL preview"
      />

      <div className="p7l-trmnl-preview__actions">
        <Button
          variant="primary"
          size="md"
          loading={refreshing}
          disabled={refreshing || loading}
          onClick={handleRefresh}
        >
          {refreshing ? 'Rendering…' : '↻ Refresh'}
        </Button>
      </div>

      {error && (
        <div style={{ padding: '0 18px 12px' }}>
          <Banner tone="error" title="Preview unavailable">
            {error}
          </Banner>
        </div>
      )}

      <div className="p7l-trmnl-preview__stage-wrap">
        {loading && !error && (
          <div
            className="p7l-trmnl-preview__skeleton"
            style={{ width: stageW, height: stageH }}
          >
            Loading preview…
          </div>
        )}

        {html && !loading && (
          <div
            className="p7l-trmnl-preview__stage"
            style={{ width: stageW, height: stageH }}
          >
            <iframe
              srcDoc={html}
              title="TRMNL display preview"
              scrolling="no"
              style={{
                width: DISPLAY_W,
                height: DISPLAY_H,
                transform: `scale(${SCALE})`,
              }}
            />
          </div>
        )}
      </div>

      <div style={{ padding: '0 18px 24px' }}>
        <InfoCard>
          The preview shows the HTML template rendered by the plant-renderer container.
          The actual TRMNL display fetches a screenshot image from the renderer on its
          own schedule. Tap Refresh to trigger an immediate re-render.
        </InfoCard>
      </div>
    </div>
  );
}
