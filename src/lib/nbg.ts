import type { CurrencyRate, RatesSnapshot } from './types';

export const NBG_API_URL = 'https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/';

export type NbgErrorKind = 'network' | 'http' | 'format';

export class NbgError extends Error {
  override name = 'NbgError';
  constructor(
    readonly kind: NbgErrorKind,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/** Build the API URL. Without `currencies` the API returns every currency. */
export function buildRatesUrl(date?: string, currencies: string[] = []): string {
  const url = new URL(NBG_API_URL);
  if (currencies.length > 0) url.searchParams.set('currencies', currencies.join(','));
  if (date) url.searchParams.set('date', date);
  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseCurrency(raw: unknown): CurrencyRate {
  if (!isRecord(raw)) throw new NbgError('format', 'Currency entry is not an object');
  const { code, name, quantity, rate, diff } = raw;
  if (
    typeof code !== 'string' ||
    typeof rate !== 'number' ||
    typeof quantity !== 'number' ||
    !(rate > 0) ||
    !(quantity > 0)
  ) {
    throw new NbgError('format', `Malformed currency entry: ${JSON.stringify(raw)}`);
  }
  return {
    code,
    name: typeof name === 'string' ? name : code,
    quantity,
    rate,
    diff: typeof diff === 'number' ? diff : 0,
  };
}

/**
 * Validate and normalise an API payload.
 * Returns `null` when the bank has no data for the day (the API answers `[]`).
 */
export function parseRatesResponse(payload: unknown): RatesSnapshot | null {
  if (!Array.isArray(payload)) throw new NbgError('format', 'Response is not an array');
  const first: unknown = payload[0];
  if (first === undefined) return null;
  if (!isRecord(first) || typeof first.date !== 'string' || !Array.isArray(first.currencies)) {
    throw new NbgError('format', 'Response has no date or currencies');
  }
  const currencies = first.currencies.map(parseCurrency);
  if (currencies.length === 0) return null;
  return { date: first.date.slice(0, 10), currencies };
}

export interface FetchRatesOptions {
  fetch?: typeof fetch;
  signal?: AbortSignal;
}

/**
 * Load every currency for a day.
 * The API falls back to the latest earlier rate (weekends, holidays, future days),
 * so `snapshot.date` can differ from `date`.
 */
export async function fetchRates(
  date?: string,
  { fetch: fetchImpl = fetch, signal }: FetchRatesOptions = {},
): Promise<RatesSnapshot | null> {
  let response: Response;
  try {
    response = await fetchImpl(buildRatesUrl(date), { signal });
  } catch (cause) {
    throw new NbgError('network', 'Could not reach nbg.gov.ge', { cause });
  }
  if (!response.ok) throw new NbgError('http', `NBG API answered ${response.status}`);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new NbgError('format', 'Response is not valid JSON', { cause });
  }
  return parseRatesResponse(payload);
}
