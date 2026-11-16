import { describe, expect, it } from 'vitest';
import { formatDisplayDate, isIsoDate, shiftDate, todayInTbilisi } from '../src/lib/dates';

describe('isIsoDate', () => {
  it.each(['2026-10-22', '2024-02-29', '1999-12-31'])('accepts %s', (value) => {
    expect(isIsoDate(value)).toBe(true);
  });

  it.each(['', 'abc', '2026-13-01', '2026-02-30', '2025-02-29', '22.10.2026', '2026-1-2'])(
    'rejects %j',
    (value) => {
      expect(isIsoDate(value)).toBe(false);
    },
  );
});

describe('todayInTbilisi', () => {
  it('uses UTC+4, so the day starts at 20:00 UTC', () => {
    expect(todayInTbilisi(new Date('2026-10-21T19:59:59Z'))).toBe('2026-10-21');
    expect(todayInTbilisi(new Date('2026-10-21T20:00:00Z'))).toBe('2026-10-22');
  });

  it('rolls over the year', () => {
    expect(todayInTbilisi(new Date('2026-12-31T21:00:00Z'))).toBe('2027-01-01');
  });
});

describe('shiftDate', () => {
  it('moves across month and year boundaries', () => {
    expect(shiftDate('2026-10-31', 1)).toBe('2026-11-01');
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDate('2024-02-28', 2)).toBe('2024-03-01');
    expect(shiftDate('2026-10-22', 0)).toBe('2026-10-22');
  });
});

describe('formatDisplayDate', () => {
  it('formats in the given locale regardless of the machine time zone', () => {
    expect(formatDisplayDate('2026-10-22', 'en-GB')).toBe('22 Oct 2026');
    expect(formatDisplayDate('2026-01-01', 'en-US')).toBe('Jan 1, 2026');
  });
});
