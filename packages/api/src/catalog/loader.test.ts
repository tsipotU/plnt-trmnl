import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadCatalog, createCatalog } from './loader.js';
import type { CatalogEntry } from './types.js';

function makeEntry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    slug: 'sansevieria-trifasciata',
    latin_name: 'Sansevieria trifasciata',
    aliases: ['Dracaena trifasciata'],
    common_names: {
      en: ['Snake plant', "Mother-in-law's tongue"],
      nl: ['Vrouwentong', 'Sanseveria'],
    },
    category: 'foliage',
    care: {
      base_interval_days: 14,
      light_preference: 'medium',
      placement_hints: 'Tolerates low light; drought-tolerant; avoid overwatering',
      toxicity: 'mildly toxic to pets',
      size_category: 'medium',
      difficulty: 'beginner',
    },
    origin: 'West Africa',
    common_conditions: ['root rot from overwatering', 'mealybugs'],
    ...overrides,
  };
}

function writeTemp(contents: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
  const p = path.join(dir, 'plants.json');
  fs.writeFileSync(p, contents, 'utf-8');
  return p;
}

describe('catalog loader', () => {
  const tempFiles: string[] = [];

  afterEach(() => {
    for (const p of tempFiles.splice(0)) {
      try {
        fs.rmSync(path.dirname(p), { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  function tmp(json: string): string {
    const p = writeTemp(json);
    tempFiles.push(p);
    return p;
  }

  describe('loadCatalog', () => {
    it('loads and returns a list of entries from valid JSON', () => {
      const entry = makeEntry();
      const p = tmp(JSON.stringify([entry]));
      const catalog = loadCatalog(p);
      expect(catalog.all()).toHaveLength(1);
      expect(catalog.all()[0].slug).toBe('sansevieria-trifasciata');
    });

    it('throws on malformed JSON', () => {
      const p = tmp('{not json');
      expect(() => loadCatalog(p)).toThrow(/parse/i);
    });

    it('throws when top-level is not an array', () => {
      const p = tmp(JSON.stringify({ entries: [] }));
      expect(() => loadCatalog(p)).toThrow(/array/i);
    });

    it('throws when an entry is missing required fields', () => {
      const bad = { ...makeEntry(), latin_name: undefined } as unknown as CatalogEntry;
      const p = tmp(JSON.stringify([bad]));
      expect(() => loadCatalog(p)).toThrow(/latin_name/i);
    });

    it('throws when common_names.nl is missing', () => {
      const bad = makeEntry();
      // @ts-expect-error intentionally malformed
      delete bad.common_names.nl;
      const p = tmp(JSON.stringify([bad]));
      expect(() => loadCatalog(p)).toThrow(/nl/);
    });

    it('throws on duplicate slugs', () => {
      const a = makeEntry({ slug: 'dup', latin_name: 'A' });
      const b = makeEntry({ slug: 'dup', latin_name: 'B' });
      const p = tmp(JSON.stringify([a, b]));
      expect(() => loadCatalog(p)).toThrow(/duplicate.*dup/i);
    });

    it('throws when category is invalid', () => {
      const bad = makeEntry();
      // @ts-expect-error intentionally bad value
      bad.category = 'not-a-real-category';
      const p = tmp(JSON.stringify([bad]));
      expect(() => loadCatalog(p)).toThrow(/category/i);
    });
  });

  describe('createCatalog (in-memory search)', () => {
    const entries: CatalogEntry[] = [
      makeEntry({
        slug: 'sansevieria-trifasciata',
        latin_name: 'Sansevieria trifasciata',
        aliases: ['Dracaena trifasciata'],
        common_names: { en: ['Snake plant', "Mother-in-law's tongue"], nl: ['Vrouwentong'] },
      }),
      makeEntry({
        slug: 'monstera-deliciosa',
        latin_name: 'Monstera deliciosa',
        aliases: [],
        common_names: { en: ['Swiss cheese plant'], nl: ['Gatenplant'] },
        category: 'foliage',
      }),
      makeEntry({
        slug: 'phalaenopsis',
        latin_name: 'Phalaenopsis',
        aliases: ['moth orchid'],
        common_names: { en: ['Orchid'], nl: ['Vlinderorchidee'] },
        category: 'flowering',
      }),
    ];

    it('matches by Latin name (case-insensitive substring)', () => {
      const catalog = createCatalog(entries);
      const hits = catalog.search('monstera');
      expect(hits.map(h => h.slug)).toContain('monstera-deliciosa');
    });

    it('matches by English common name', () => {
      const catalog = createCatalog(entries);
      const hits = catalog.search('snake');
      expect(hits.map(h => h.slug)).toContain('sansevieria-trifasciata');
    });

    it('matches by Dutch common name', () => {
      const catalog = createCatalog(entries);
      const hits = catalog.search('vrouwentong');
      expect(hits.map(h => h.slug)).toContain('sansevieria-trifasciata');
    });

    it('matches by alias (taxonomic synonym)', () => {
      const catalog = createCatalog(entries);
      const hits = catalog.search('dracaena trifasciata');
      expect(hits.map(h => h.slug)).toContain('sansevieria-trifasciata');
    });

    it('matches token prefix (e.g. "mon" -> "Monstera")', () => {
      const catalog = createCatalog(entries);
      const hits = catalog.search('mon');
      expect(hits.map(h => h.slug)).toContain('monstera-deliciosa');
    });

    it('returns empty array for no matches', () => {
      const catalog = createCatalog(entries);
      expect(catalog.search('xyzzy')).toEqual([]);
    });

    it('returns empty array for empty / whitespace query', () => {
      const catalog = createCatalog(entries);
      expect(catalog.search('')).toEqual([]);
      expect(catalog.search('   ')).toEqual([]);
    });

    it('honors the limit argument', () => {
      const catalog = createCatalog(entries);
      const hits = catalog.search('a', 1); // "a" is very broad — many matches
      expect(hits.length).toBeLessThanOrEqual(1);
    });

    it('result objects have {slug, latin_name, category, primary_common_name}', () => {
      const catalog = createCatalog(entries);
      const hit = catalog.search('monstera')[0];
      expect(hit).toEqual({
        slug: 'monstera-deliciosa',
        latin_name: 'Monstera deliciosa',
        category: 'foliage',
        primary_common_name: 'Swiss cheese plant',
      });
    });

    it('ranks exact latin match higher than incidental substring hits', () => {
      const catalog = createCatalog(entries);
      const hits = catalog.search('Phalaenopsis');
      expect(hits[0].slug).toBe('phalaenopsis');
    });
  });

  describe('findBySpecies (#37)', () => {
    const entries: CatalogEntry[] = [
      makeEntry({
        slug: 'monstera-deliciosa',
        latin_name: 'Monstera deliciosa',
        aliases: ['Split-leaf philodendron'],
        common_names: { en: ['Swiss cheese plant', 'Monstera'], nl: ['Gatenplant'] },
      }),
      makeEntry({
        slug: 'sansevieria-trifasciata',
        latin_name: 'Sansevieria trifasciata',
        aliases: ['Dracaena trifasciata'],
        common_names: { en: ['Snake plant'], nl: ['Vrouwentong'] },
      }),
    ];

    it('matches by exact Latin name (case-insensitive)', () => {
      const catalog = createCatalog(entries);
      expect(catalog.findBySpecies('Monstera deliciosa')?.slug).toBe('monstera-deliciosa');
      expect(catalog.findBySpecies('monstera deliciosa')?.slug).toBe('monstera-deliciosa');
    });

    it('matches by alias', () => {
      const catalog = createCatalog(entries);
      expect(catalog.findBySpecies('Dracaena trifasciata')?.slug).toBe('sansevieria-trifasciata');
    });

    it('matches by English common name', () => {
      const catalog = createCatalog(entries);
      expect(catalog.findBySpecies('Swiss cheese plant')?.slug).toBe('monstera-deliciosa');
    });

    it('matches by Dutch common name', () => {
      const catalog = createCatalog(entries);
      expect(catalog.findBySpecies('Gatenplant')?.slug).toBe('monstera-deliciosa');
    });

    it('trims surrounding whitespace', () => {
      const catalog = createCatalog(entries);
      expect(catalog.findBySpecies('  Monstera deliciosa  ')?.slug).toBe('monstera-deliciosa');
    });

    it('returns undefined for null / empty / unknown', () => {
      const catalog = createCatalog(entries);
      expect(catalog.findBySpecies(null)).toBeUndefined();
      expect(catalog.findBySpecies(undefined)).toBeUndefined();
      expect(catalog.findBySpecies('')).toBeUndefined();
      expect(catalog.findBySpecies('   ')).toBeUndefined();
      expect(catalog.findBySpecies('Not a real plant')).toBeUndefined();
    });

    it('does not do substring matching (exact only)', () => {
      const catalog = createCatalog(entries);
      // "Monstera" alone IS a common_names.en entry, so matches.
      expect(catalog.findBySpecies('Monstera')?.slug).toBe('monstera-deliciosa');
      // But "Monster" is not in any name list.
      expect(catalog.findBySpecies('Monster')).toBeUndefined();
    });
  });

  describe('loader validates optional lore / etymology (#37)', () => {
    function tmpLocal(json: string): string {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
      const p = path.join(dir, 'plants.json');
      fs.writeFileSync(p, json, 'utf-8');
      return p;
    }

    it('accepts entries with lore and etymology', () => {
      const e = makeEntry({ lore: 'Ancient folklore', etymology: 'From Greek' });
      const catalog = loadCatalog(tmpLocal(JSON.stringify([e])));
      expect(catalog.all()[0].lore).toBe('Ancient folklore');
      expect(catalog.all()[0].etymology).toBe('From Greek');
    });

    it('accepts entries with lore and etymology omitted', () => {
      const e = makeEntry();
      const catalog = loadCatalog(tmpLocal(JSON.stringify([e])));
      expect(catalog.all()[0].lore).toBeUndefined();
    });

    it('rejects empty-string lore', () => {
      const e = { ...makeEntry(), lore: '' } as CatalogEntry;
      expect(() => loadCatalog(tmpLocal(JSON.stringify([e])))).toThrow(/lore/);
    });
  });
});
