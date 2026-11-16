import type { KeyValueStore, RatesSnapshot } from './types';

export const CACHE_KEY = 'ratesCache';

interface CacheEntry {
  snapshot: RatesSnapshot;
  savedAt: number;
}
type CacheData = Record<string, CacheEntry>;

export interface RatesCacheOptions {
  /** Current time in ms. */
  now?: () => number;
  /** Current day in Tbilisi, `YYYY-MM-DD`. */
  today: () => string;
  /** Lifetime of entries that can still change (requested day is in the future). */
  ttlMs?: number;
  maxEntries?: number;
}

export interface RatesCache {
  get(date: string): Promise<RatesSnapshot | undefined>;
  set(date: string, snapshot: RatesSnapshot): Promise<void>;
}

/**
 * Cache of snapshots keyed by the *requested* day.
 *
 * A rate for today or any past day never changes, so those entries live until evicted.
 * A request for a future day returns the latest known rate, which the bank replaces
 * around 17:00 Tbilisi time — those entries expire after `ttlMs`.
 */
export function createRatesCache(
  store: KeyValueStore,
  { now = Date.now, today, ttlMs = 10 * 60_000, maxEntries = 60 }: RatesCacheOptions,
): RatesCache {
  const read = async (): Promise<CacheData> => (await store.get<CacheData>(CACHE_KEY)) ?? {};

  return {
    async get(date) {
      const entry = (await read())[date];
      if (!entry) return undefined;
      const immutable = date <= today();
      return immutable || now() - entry.savedAt < ttlMs ? entry.snapshot : undefined;
    },

    async set(date, snapshot) {
      const data = await read();
      data[date] = { snapshot, savedAt: now() };
      const oldestFirst = Object.entries(data).sort(([, a], [, b]) => a.savedAt - b.savedAt);
      for (const [key] of oldestFirst.slice(0, Math.max(0, oldestFirst.length - maxEntries))) {
        delete data[key];
      }
      await store.set(CACHE_KEY, data);
    },
  };
}

export type RatesLoader = (date: string) => Promise<RatesSnapshot | null>;

/** Cache-first loader. A broken cache must never block a network request. */
export function createRatesLoader(cache: RatesCache, fetcher: RatesLoader): RatesLoader {
  return async (date) => {
    const cached = await cache.get(date).catch(() => undefined);
    if (cached) return cached;
    const snapshot = await fetcher(date);
    if (snapshot) await cache.set(date, snapshot).catch(() => undefined);
    return snapshot;
  };
}
