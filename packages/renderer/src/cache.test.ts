import { describe, it, expect, beforeEach } from 'vitest';
import { screenCache } from './cache.js';

describe('ScreenCache', () => {
  beforeEach(() => {
    screenCache.clear();
  });

  it('returns null for get() before any set', () => {
    expect(screenCache.get()).toBeNull();
  });

  it('returns null for getLastPushTime() before any set', () => {
    expect(screenCache.getLastPushTime()).toBeNull();
  });

  it('set/get roundtrip stores and retrieves HTML', () => {
    const html = '<html><body>plant day</body></html>';
    screenCache.set(html);
    expect(screenCache.get()).toBe(html);
  });

  it('getLastPushTime returns a Date after set', () => {
    const before = new Date();
    screenCache.set('<div>content</div>');
    const after = new Date();

    const pushTime = screenCache.getLastPushTime();
    expect(pushTime).toBeInstanceOf(Date);
    expect(pushTime!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(pushTime!.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('clear resets html to null', () => {
    screenCache.set('<div>some content</div>');
    screenCache.clear();
    expect(screenCache.get()).toBeNull();
  });

  it('clear resets lastPushTime to null', () => {
    screenCache.set('<div>some content</div>');
    screenCache.clear();
    expect(screenCache.getLastPushTime()).toBeNull();
  });

  it('set overwrites previously cached html', () => {
    screenCache.set('<div>first</div>');
    screenCache.set('<div>second</div>');
    expect(screenCache.get()).toBe('<div>second</div>');
  });

  it('lastPushTime updates on each set', async () => {
    screenCache.set('<div>first</div>');
    const firstTime = screenCache.getLastPushTime()!.getTime();

    // Small delay to ensure timestamps differ
    await new Promise(resolve => setTimeout(resolve, 5));

    screenCache.set('<div>second</div>');
    const secondTime = screenCache.getLastPushTime()!.getTime();

    expect(secondTime).toBeGreaterThanOrEqual(firstTime);
  });
});
