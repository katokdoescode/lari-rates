import { describe, expect, it, vi } from 'vitest';
import {
  buildRatesUrl,
  fetchRates,
  NBG_API_URL,
  NbgError,
  parseRatesResponse,
} from '../src/lib/nbg';
import { apiPayload } from './helpers';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('buildRatesUrl', () => {
  it('returns the bare endpoint without arguments', () => {
    expect(buildRatesUrl()).toBe(NBG_API_URL);
  });

  it('adds the date', () => {
    expect(buildRatesUrl('2026-10-22')).toBe(`${NBG_API_URL}?date=2026-10-22`);
  });

  it('adds a comma-separated currency list', () => {
    const url = new URL(buildRatesUrl('2026-10-22', ['EUR', 'USD']));
    expect(url.searchParams.get('currencies')).toBe('EUR,USD');
    expect(url.searchParams.get('date')).toBe('2026-10-22');
  });
});

describe('parseRatesResponse', () => {
  it('normalises a live-shaped payload', () => {
    expect(parseRatesResponse(apiPayload())).toEqual({
      date: '2026-10-22',
      currencies: [
        { code: 'EUR', name: 'Euro', quantity: 1, rate: 2.9163, diff: 0.0036 },
        { code: 'AMD', name: 'Armenian Dram', quantity: 1000, rate: 7.1731, diff: -0.0006 },
      ],
    });
  });

  it('returns null when the bank has no data', () => {
    expect(parseRatesResponse([])).toBeNull();
    expect(parseRatesResponse([{ date: '2026-10-22T00:00:00.000Z', currencies: [] }])).toBeNull();
  });

  it('fills in optional fields', () => {
    const snapshot = parseRatesResponse([
      { date: '2026-10-22T00:00:00.000Z', currencies: [{ code: 'EUR', quantity: 1, rate: 2.9 }] },
    ]);
    expect(snapshot?.currencies[0]).toEqual({
      code: 'EUR',
      name: 'EUR',
      quantity: 1,
      rate: 2.9,
      diff: 0,
    });
  });

  it.each([
    ['an object', { errors: [] }],
    ['null', null],
    ['an entry without date', [{ currencies: [] }]],
    ['an entry without currencies', [{ date: '2026-10-22' }]],
    ['a non-object currency', [{ date: '2026-10-22', currencies: ['EUR'] }]],
    [
      'a string rate',
      [{ date: '2026-10-22', currencies: [{ code: 'EUR', quantity: 1, rate: '2.9' }] }],
    ],
    ['a zero rate', [{ date: '2026-10-22', currencies: [{ code: 'EUR', quantity: 1, rate: 0 }] }]],
    [
      'a zero quantity',
      [{ date: '2026-10-22', currencies: [{ code: 'EUR', quantity: 0, rate: 2 }] }],
    ],
    ['a missing code', [{ date: '2026-10-22', currencies: [{ quantity: 1, rate: 2 }] }]],
  ])('rejects %s', (_label, payload) => {
    expect(() => parseRatesResponse(payload)).toThrowError(NbgError);
  });
});

describe('fetchRates', () => {
  it('requests all currencies for the date and parses the answer', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(apiPayload()));
    const snapshot = await fetchRates('2026-10-22', { fetch: fetchMock });

    expect(fetchMock).toHaveBeenCalledWith(`${NBG_API_URL}?date=2026-10-22`, { signal: undefined });
    expect(snapshot?.date).toBe('2026-10-22');
    expect(snapshot?.currencies).toHaveLength(2);
  });

  it('returns null for an empty answer', async () => {
    expect(await fetchRates('1990-01-01', { fetch: async () => jsonResponse([]) })).toBeNull();
  });

  it('wraps network failures', async () => {
    const failing = async () => {
      throw new TypeError('Failed to fetch');
    };
    await expect(fetchRates('2026-10-22', { fetch: failing })).rejects.toMatchObject({
      name: 'NbgError',
      kind: 'network',
    });
  });

  it('reports HTTP errors', async () => {
    const fetchMock = async () => jsonResponse({ errors: [] }, 422);
    await expect(fetchRates('2026-10-22', { fetch: fetchMock })).rejects.toMatchObject({
      kind: 'http',
      message: expect.stringContaining('422'),
    });
  });

  it('reports invalid JSON', async () => {
    const fetchMock = async () => new Response('<html>maintenance</html>');
    await expect(fetchRates('2026-10-22', { fetch: fetchMock })).rejects.toMatchObject({
      kind: 'format',
    });
  });
});
