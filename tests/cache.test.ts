import { describe, expect, it, vi } from 'vitest';
import { CACHE_KEY, createRatesCache, createRatesLoader } from '../src/lib/cache';
import type { KeyValueStore } from '../src/lib/types';
import { memoryStore, snapshotOf } from './helpers';

const TODAY = '2026-10-22';

function setup(options: { ttlMs?: number; maxEntries?: number } = {}) {
  const clock = { now: 1_000_000 };
  const store = memoryStore();
  const cache = createRatesCache(store, { now: () => clock.now, today: () => TODAY, ...options });
  return { clock, store, cache };
}

describe('createRatesCache', () => {
  it('misses on an empty cache', async () => {
    expect(await setup().cache.get(TODAY)).toBeUndefined();
  });

  it('keeps past and current days forever', async () => {
    const { cache, clock } = setup();
    await cache.set('2026-10-01', snapshotOf('2026-10-01'));
    await cache.set(TODAY, snapshotOf(TODAY));
    clock.now += 365 * 86_400_000;

    expect(await cache.get('2026-10-01')).toEqual(snapshotOf('2026-10-01'));
    expect(await cache.get(TODAY)).toEqual(snapshotOf(TODAY));
  });

  it('expires future days after the TTL', async () => {
    const { cache, clock } = setup({ ttlMs: 1000 });
    await cache.set('2026-10-23', snapshotOf(TODAY));

    clock.now += 999;
    expect(await cache.get('2026-10-23')).toEqual(snapshotOf(TODAY));
    clock.now += 1;
    expect(await cache.get('2026-10-23')).toBeUndefined();
  });

  it('evicts the oldest entries beyond maxEntries', async () => {
    const { cache, clock, store } = setup({ maxEntries: 2 });
    for (const date of ['2026-10-01', '2026-10-02', '2026-10-03']) {
      await cache.set(date, snapshotOf(date));
      clock.now += 1;
    }

    expect(await cache.get('2026-10-01')).toBeUndefined();
    expect(await cache.get('2026-10-02')).toBeDefined();
    expect(await cache.get('2026-10-03')).toBeDefined();
    expect(Object.keys((await store.get<object>(CACHE_KEY)) ?? {})).toHaveLength(2);
  });

  it('overwrites an existing day', async () => {
    const { cache } = setup();
    await cache.set(TODAY, snapshotOf('2026-10-21'));
    await cache.set(TODAY, snapshotOf(TODAY));
    expect((await cache.get(TODAY))?.date).toBe(TODAY);
  });
});

describe('createRatesLoader', () => {
  it('fetches once and then serves from the cache', async () => {
    const { cache } = setup();
    const fetcher = vi.fn(async (date: string) => snapshotOf(date));
    const load = createRatesLoader(cache, fetcher);

    expect(await load(TODAY)).toEqual(snapshotOf(TODAY));
    expect(await load(TODAY)).toEqual(snapshotOf(TODAY));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not cache "no data" answers', async () => {
    const { cache } = setup();
    const fetcher = vi.fn(async () => null);
    const load = createRatesLoader(cache, fetcher);

    expect(await load('1990-01-01')).toBeNull();
    expect(await load('1990-01-01')).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('propagates fetch errors', async () => {
    const load = createRatesLoader(setup().cache, async () => {
      throw new Error('offline');
    });
    await expect(load(TODAY)).rejects.toThrow('offline');
  });

  it('still works when storage is broken', async () => {
    const broken: KeyValueStore = {
      get: async () => {
        throw new Error('storage unavailable');
      },
      set: async () => {
        throw new Error('quota exceeded');
      },
    };
    const cache = createRatesCache(broken, { today: () => TODAY });
    const load = createRatesLoader(cache, async (date) => snapshotOf(date));

    expect(await load(TODAY)).toEqual(snapshotOf(TODAY));
  });
});
