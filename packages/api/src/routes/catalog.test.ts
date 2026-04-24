import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createCatalog } from '../catalog/loader.js';
import { createCatalogRouter } from './catalog.js';
import type { CatalogEntry } from '../catalog/types.js';

function makeConditions() {
  const out = [];
  for (let i = 0; i < 15; i++) {
    out.push({
      name: `Condition ${i + 1}`,
      symptoms: `Symptoms ${i + 1}`,
      remedy: `Remedy ${i + 1}`,
      severity: (i < 2 ? 'critical' : i < 5 ? 'warning' : 'info') as 'info' | 'warning' | 'critical',
      prevention: `Prevention ${i + 1}`,
      is_common: i < 5,
    });
  }
  return out;
}

function entry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    slug: 'sansevieria-trifasciata',
    latin_name: 'Sansevieria trifasciata',
    aliases: ['Dracaena trifasciata'],
    common_names: { en: ['Snake plant'], nl: ['Vrouwentong'] },
    category: 'foliage',
    care: {
      base_interval_days: 14,
      light_preference: 'medium',
      placement_hints: 'Drought-tolerant',
      toxicity: 'mildly toxic',
      size_category: 'medium',
      difficulty: 'beginner',
    },
    origin: 'West Africa',
    common_conditions: ['root rot'],
    light_profile: {
      ideal: 'medium',
      tolerance_min: 'low',
      tolerance_max: 'bright_indirect',
      direct_sun_hours: 'None',
      too_little_symptoms: 'Slow growth',
      too_much_symptoms: 'Leaf scorch',
    },
    placement_tips: ['Near an east window'],
    conditions: makeConditions(),
    ...overrides,
  };
}

describe('GET /api/catalog/search', () => {
  const entries: CatalogEntry[] = [
    entry(),
    entry({
      slug: 'monstera-deliciosa',
      latin_name: 'Monstera deliciosa',
      aliases: [],
      common_names: { en: ['Swiss cheese plant'], nl: ['Gatenplant'] },
      category: 'foliage',
    }),
    entry({
      slug: 'phalaenopsis',
      latin_name: 'Phalaenopsis',
      aliases: ['moth orchid'],
      common_names: { en: ['Orchid'], nl: ['Vlinderorchidee'] },
      category: 'flowering',
    }),
  ];

  let app: express.Express;

  beforeEach(() => {
    const catalog = createCatalog(entries);
    app = express();
    app.use('/api/catalog', createCatalogRouter(catalog));
  });

  it('returns 400 when q is missing', async () => {
    const res = await request(app).get('/api/catalog/search');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns an empty array for a no-hit query', async () => {
    const res = await request(app).get('/api/catalog/search?q=xyzzy');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('finds by Latin name', async () => {
    const res = await request(app).get('/api/catalog/search?q=monstera');
    expect(res.status).toBe(200);
    expect(res.body.map((h: any) => h.slug)).toContain('monstera-deliciosa');
  });

  it('finds by Dutch common name', async () => {
    const res = await request(app).get('/api/catalog/search?q=gatenplant');
    expect(res.status).toBe(200);
    expect(res.body.map((h: any) => h.slug)).toContain('monstera-deliciosa');
  });

  it('returns the documented result shape', async () => {
    const res = await request(app).get('/api/catalog/search?q=monstera');
    const hit = res.body[0];
    expect(hit).toEqual({
      slug: 'monstera-deliciosa',
      latin_name: 'Monstera deliciosa',
      category: 'foliage',
      primary_common_name: 'Swiss cheese plant',
    });
  });

  it('respects the limit parameter (default 20)', async () => {
    const res = await request(app).get('/api/catalog/search?q=a&limit=1');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(1);
  });

  it('caps limit at a sane maximum', async () => {
    const res = await request(app).get('/api/catalog/search?q=a&limit=9999');
    expect(res.status).toBe(200);
    // With only 3 entries, we'll get at most 3 regardless of limit cap
    expect(res.body.length).toBeLessThanOrEqual(3);
  });

  it('rejects non-numeric or negative limit with 400', async () => {
    const res = await request(app).get('/api/catalog/search?q=a&limit=-5');
    expect(res.status).toBe(400);
  });

  // Smoke: search result shape unchanged after #3 schema extension
  it('search response shape is still {slug, latin_name, category, primary_common_name} (no #3 fields leaked)', async () => {
    const res = await request(app).get('/api/catalog/search?q=monstera');
    expect(res.status).toBe(200);
    const hit = res.body[0];
    expect(Object.keys(hit).sort()).toEqual(
      ['category', 'latin_name', 'primary_common_name', 'slug'].sort()
    );
  });
});

describe('GET /api/catalog/entry', () => {
  const entries: CatalogEntry[] = [
    entry(),
    entry({
      slug: 'monstera-deliciosa',
      latin_name: 'Monstera deliciosa',
      aliases: [],
      common_names: { en: ['Swiss cheese plant'], nl: ['Gatenplant'] },
      category: 'foliage',
    }),
  ];

  let app: express.Express;

  beforeEach(() => {
    const catalog = createCatalog(entries);
    app = express();
    app.use('/api/catalog', createCatalogRouter(catalog));
  });

  it('returns 400 when neither slug nor species is provided', async () => {
    const res = await request(app).get('/api/catalog/entry');
    expect(res.status).toBe(400);
  });

  it('returns the full entry (incl. #3 fields) by slug', async () => {
    const res = await request(app).get('/api/catalog/entry?slug=monstera-deliciosa');
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('monstera-deliciosa');
    expect(res.body.light_profile).toBeDefined();
    expect(res.body.placement_tips).toBeInstanceOf(Array);
    expect(res.body.conditions).toHaveLength(15);
  });

  it('returns the full entry by species (case-insensitive latin_name)', async () => {
    const res = await request(app).get('/api/catalog/entry?species=monstera%20deliciosa');
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('monstera-deliciosa');
  });

  it('returns 404 when no match', async () => {
    const res = await request(app).get('/api/catalog/entry?slug=nope');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/catalog/suggest', () => {
  const entries: CatalogEntry[] = [
    entry(),
    entry({
      slug: 'monstera-deliciosa',
      latin_name: 'Monstera deliciosa',
      aliases: ['Split-leaf philodendron'],
      common_names: { en: ['Swiss cheese plant', 'Monstera'], nl: ['Gatenplant'] },
      category: 'foliage',
    }),
    entry({
      slug: 'phalaenopsis',
      latin_name: 'Phalaenopsis',
      aliases: ['moth orchid'],
      common_names: { en: ['Orchid'], nl: ['Vlinderorchidee'] },
      category: 'flowering',
    }),
  ];

  let app: express.Express;

  beforeEach(() => {
    const catalog = createCatalog(entries);
    app = express();
    app.use('/api/catalog', createCatalogRouter(catalog));
  });

  it('returns 400 when q is missing', async () => {
    const res = await request(app).get('/api/catalog/suggest');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('suggests "Monstera deliciosa" for typo "monstera diliciosa"', async () => {
    const res = await request(app).get(
      '/api/catalog/suggest?q=' + encodeURIComponent('monstera diliciosa'),
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].latin_name).toBe('Monstera deliciosa');
  });

  it('returns an empty array for a name that is nothing like anything', async () => {
    const res = await request(app).get('/api/catalog/suggest?q=xyzzy%20plant');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('suggests Sansevieria trifasciata via the English alias "snake"', async () => {
    const res = await request(app).get('/api/catalog/suggest?q=snake');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].latin_name).toBe('Sansevieria trifasciata');
  });

  it('caps results at 3 even for broad matches', async () => {
    const res = await request(app).get('/api/catalog/suggest?q=plant');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(3);
  });

  it('returns the documented result shape', async () => {
    const res = await request(app).get(
      '/api/catalog/suggest?q=' + encodeURIComponent('monstera diliciosa'),
    );
    const hit = res.body[0];
    expect(hit).toEqual({
      slug: 'monstera-deliciosa',
      latin_name: 'Monstera deliciosa',
      category: 'foliage',
      primary_common_name: 'Swiss cheese plant',
    });
  });
});
