import { describe, it, expect } from 'vitest';
import { buildAiSetupPrompt } from './ai-setup-prompt';

describe('buildAiSetupPrompt', () => {
  it('substitutes BASE_URL into the template', () => {
    const out = buildAiSetupPrompt({ baseUrl: 'http://nas.local:3900', sampleFacts: ['fact one', 'fact two'] });
    expect(out).toContain('http://nas.local:3900/api/plants?enrichment=pending');
    expect(out).not.toContain('{{BASE_URL}}');
  });

  it('embeds all sample facts, numbered', () => {
    const out = buildAiSetupPrompt({ baseUrl: 'http://x', sampleFacts: ['alpha fact', 'bravo fact', 'charlie fact'] });
    expect(out).toMatch(/1\. alpha fact/);
    expect(out).toMatch(/2\. bravo fact/);
    expect(out).toMatch(/3\. charlie fact/);
  });

  it('handles 0 sample facts gracefully', () => {
    const out = buildAiSetupPrompt({ baseUrl: 'http://x', sampleFacts: [] });
    expect(out).toContain('No sample facts available yet');
    expect(out).not.toContain('{{SAMPLE_FACTS}}');
  });

  it('mentions both endpoints (plants enrichment + conditions care-update)', () => {
    const out = buildAiSetupPrompt({ baseUrl: 'http://x', sampleFacts: [] });
    expect(out).toContain('POST http://x/api/plants/{id}/enrichment');
    expect(out).toContain('POST http://x/api/conditions/{id}/care-update');
  });
});
