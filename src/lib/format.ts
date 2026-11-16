import type { CurrencyRate } from './types';

export const RATE_DIGITS = 4;
export const AMOUNT_DIGITS = 2;

export type ConvertDirection = 'toGel' | 'fromGel';
export type Trend = 'up' | 'down' | 'flat';

/** Rate exactly as the bank prints it: four decimals, dot separator. */
export function formatRate(value: number): string {
  return value.toFixed(RATE_DIGITS);
}

/** Money amount with two decimals, rounded half away from zero. */
export function formatAmount(value: number): string {
  const factor = 10 ** AMOUNT_DIGITS;
  const rounded = Math.round((value + Math.sign(value) * Number.EPSILON) * factor) / factor;
  return rounded.toFixed(AMOUNT_DIGITS);
}

/** Convert between a foreign currency and GEL, honouring the quoted quantity. */
export function convert(amount: number, currency: CurrencyRate, direction: ConvertDirection) {
  const gelPerUnit = currency.rate / currency.quantity;
  return direction === 'toGel' ? amount * gelPerUnit : amount / gelPerUnit;
}

/** Parse user input: accepts spaces and a comma as decimal separator. `null` if not a number. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[\s ]/g, '').replace(',', '.');
  if (!/^\d*\.?\d+$|^\d+\.$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function trendOf(diff: number): Trend {
  if (diff > 0) return 'up';
  return diff < 0 ? 'down' : 'flat';
}

/** Signed change, e.g. `+0.0036` / `−0.0102`. */
export function formatDiff(diff: number): string {
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  return `${sign}${formatRate(Math.abs(diff))}`;
}

/** One-line summary for pasting, e.g. `1 EUR = 2.9163 GEL (2026-10-22)`. */
export function rateLine(currency: CurrencyRate, date: string): string {
  return `${currency.quantity} ${currency.code} = ${formatRate(currency.rate)} GEL (${date})`;
}
