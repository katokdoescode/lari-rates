import { describe, expect, it } from 'vitest';
import {
  convert,
  formatAmount,
  formatDiff,
  formatRate,
  parseAmount,
  rateLine,
  trendOf,
} from '../src/lib/format';
import { AMD, EUR } from './helpers';

describe('formatRate', () => {
  it('always prints four decimals', () => {
    expect(formatRate(2.9163)).toBe('2.9163');
    expect(formatRate(2.909)).toBe('2.9090');
    expect(formatRate(3)).toBe('3.0000');
  });
});

describe('formatAmount', () => {
  it('rounds to two decimals, half away from zero', () => {
    expect(formatAmount(291.63)).toBe('291.63');
    expect(formatAmount(1.005)).toBe('1.01');
    expect(formatAmount(2.675)).toBe('2.68');
    expect(formatAmount(0)).toBe('0.00');
    expect(formatAmount(1234.5)).toBe('1234.50');
  });
});

describe('convert', () => {
  it('converts foreign currency to GEL', () => {
    expect(convert(100, EUR, 'toGel')).toBeCloseTo(291.63, 10);
  });

  it('converts GEL to foreign currency', () => {
    expect(convert(291.63, EUR, 'fromGel')).toBeCloseTo(100, 10);
  });

  it('honours the quoted quantity', () => {
    expect(convert(1000, AMD, 'toGel')).toBeCloseTo(7.1731, 10);
    expect(convert(7.1731, AMD, 'fromGel')).toBeCloseTo(1000, 10);
  });
});

describe('parseAmount', () => {
  it.each([
    ['100', 100],
    ['12.5', 12.5],
    ['12,5', 12.5],
    ['1 000,50', 1000.5],
    ['1 000', 1000],
    ['.5', 0.5],
    ['7.', 7],
    ['0', 0],
  ])('parses %j', (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });

  it.each(['', ' ', 'abc', '-5', '1.2.3', '1,2,3', '12e3', '.'])('rejects %j', (text) => {
    expect(parseAmount(text)).toBeNull();
  });
});

describe('trendOf / formatDiff', () => {
  it('classifies the change', () => {
    expect(trendOf(0.0036)).toBe('up');
    expect(trendOf(-0.0102)).toBe('down');
    expect(trendOf(0)).toBe('flat');
  });

  it('prints a signed change', () => {
    expect(formatDiff(0.0036)).toBe('+0.0036');
    expect(formatDiff(-0.0102)).toBe('−0.0102');
    expect(formatDiff(0)).toBe('0.0000');
  });
});

describe('rateLine', () => {
  it('builds a pasteable summary', () => {
    expect(rateLine(EUR, '2026-10-22')).toBe('1 EUR = 2.9163 GEL (2026-10-22)');
    expect(rateLine(AMD, '2026-10-22')).toBe('1000 AMD = 7.1731 GEL (2026-10-22)');
  });
});
