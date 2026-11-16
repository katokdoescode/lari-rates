import type { CurrencyRate, KeyValueStore, RatesSnapshot } from '../src/lib/types';

/** In-memory `KeyValueStore` that deep-copies values like real extension storage does. */
export function memoryStore(initial: Record<string, unknown> = {}) {
  const data = new Map<string, string>(
    Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]),
  );
  const store: KeyValueStore = {
    async get<T>(key: string) {
      const raw = data.get(key);
      return raw === undefined ? undefined : (JSON.parse(raw) as T);
    },
    async set(key, value) {
      data.set(key, JSON.stringify(value));
    },
  };
  return Object.assign(store, { data });
}

export const EUR: CurrencyRate = {
  code: 'EUR',
  name: 'Euro',
  quantity: 1,
  rate: 2.9163,
  diff: 0.0036,
};
export const USD: CurrencyRate = {
  code: 'USD',
  name: 'US Dollar',
  quantity: 1,
  rate: 2.5931,
  diff: -0.0003,
};
export const AMD: CurrencyRate = {
  code: 'AMD',
  name: 'Armenian Dram',
  quantity: 1000,
  rate: 7.1731,
  diff: 0,
};

export function snapshotOf(date: string, currencies = [AMD, EUR, USD]): RatesSnapshot {
  return { date, currencies };
}

/** Payload shaped exactly like the live NBG API. */
export function apiPayload(date = '2026-10-22') {
  return [
    {
      date: `${date}T00:00:00.000Z`,
      currencies: [
        {
          code: 'EUR',
          quantity: 1,
          rateFormated: '2.9163',
          diffFormated: '0.0036',
          rate: 2.9163,
          name: 'Euro',
          diff: 0.0036,
          date: '2026-10-21T17:01:13.285Z',
          validFromDate: `${date}T00:00:00.000Z`,
        },
        {
          code: 'AMD',
          quantity: 1000,
          rateFormated: '7.1731',
          diffFormated: '0.0006',
          rate: 7.1731,
          name: 'Armenian Dram',
          diff: -0.0006,
          date: '2026-10-21T17:01:13.285Z',
          validFromDate: `${date}T00:00:00.000Z`,
        },
      ],
    },
  ];
}
