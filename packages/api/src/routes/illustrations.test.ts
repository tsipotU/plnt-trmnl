import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Catalog illustration static endpoint (#132).
 *
 * Mirrors the wiring in `src/index.ts`: a bare `express.static` mount under
 * `/api/illustrations` over a fixture directory we own, with `fallthrough:false`
 * so missing files surface as a real 404 instead of slipping through to the
 * SPA fallback. We don't import the production index — that boots cron and
 * loads the live database — so we replicate the mount here. The contract
 * being tested is the mount itself; the actual `assets/catalog-images`
 * directory is asserted in a separate test below.
 */

describe('GET /api/illustrations/:filename — static catalog images', () => {
  let app: express.Express;
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'illustrations-test-'));
    // Tiny PNG (1x1 transparent) — enough to confirm static middleware serves it.
    const onePxPng = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000005000100' +
        '0d0a2db40000000049454e44ae426082',
      'hex',
    );
    fs.writeFileSync(path.join(tempDir, 'monstera-deliciosa-albo-variegata.png'), onePxPng);

    app = express();
    app.use(
      '/api/illustrations',
      express.static(tempDir, { fallthrough: false, maxAge: '7d' }),
    );
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('serves a known catalog image with image/* content-type', async () => {
    const res = await request(app).get(
      '/api/illustrations/monstera-deliciosa-albo-variegata.png',
    );
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/');
    expect(res.body.length ?? res.text?.length ?? 0).toBeGreaterThan(0);
  });

  it('returns 404 for a missing image (fallthrough disabled)', async () => {
    const res = await request(app).get('/api/illustrations/nope.png');
    expect(res.status).toBe(404);
  });
});

describe('catalog-images directory contents', () => {
  it('ships the monstera-deliciosa-albo-variegata.png fixture', () => {
    // Resolved relative to this test file: src/routes/ → ../../assets/catalog-images
    const filePath = path.resolve(
      __dirname,
      '..',
      '..',
      'assets',
      'catalog-images',
      'monstera-deliciosa-albo-variegata.png',
    );
    expect(fs.existsSync(filePath)).toBe(true);
    const stat = fs.statSync(filePath);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(1000);
  });
});
