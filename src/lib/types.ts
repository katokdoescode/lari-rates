/** One currency as published by the National Bank of Georgia. */
export interface CurrencyRate {
  /** ISO 4217 code, e.g. `EUR`. */
  code: string;
  /** English currency name from the API. */
  name: string;
  /** How many units `rate` is quoted for (1, 10, 100, 1000…). */
  quantity: number;
  /** Price of `quantity` units in GEL. */
  rate: number;
  /** Signed change against the previous rate, in GEL. */
  diff: number;
}

/** All rates valid on a given day. */
export interface RatesSnapshot {
  /** Day the rates are valid from, `YYYY-MM-DD`. May be earlier than the requested day. */
  date: string;
  currencies: CurrencyRate[];
}

/** Minimal async key-value storage, satisfied by `browser.storage.local`. */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
}
