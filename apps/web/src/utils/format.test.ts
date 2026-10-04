import { describe, expect, it } from 'vitest';
import { formatDate, formatINR, formatMonth, formatMonthShort, formatShortDate, formatYM, greeting, initials, shiftMonth, toISODate, toYM } from './format';

describe('formatINR', () => {
  it('uses Indian digit grouping', () => {
    expect(formatINR(150000)).toBe('₹1,50,000');
    expect(formatINR(1234567)).toBe('₹12,34,567');
    expect(formatINR(15000)).toBe('₹15,000');
    expect(formatINR(999)).toBe('₹999');
    expect(formatINR(0)).toBe('₹0');
  });
  it('shows paise only when present', () => {
    expect(formatINR(1200)).toBe('₹1,200');
    expect(formatINR(1200.5)).toBe('₹1,200.50');
    expect(formatINR(9900, { decimals: true })).toBe('₹9,900.00');
  });
  it('handles negatives, strings and empty values', () => {
    expect(formatINR(-3900)).toBe('-₹3,900');
    expect(formatINR('8000')).toBe('₹8,000');
    expect(formatINR(null)).toBe('₹0');
    expect(formatINR(undefined)).toBe('₹0');
  });
});

describe('dates', () => {
  it('formats calendar dates from ISO strings without time zone drift', () => {
    expect(formatDate('2026-04-01T00:00:00.000Z')).toBe('01 Apr 2026');
    expect(formatDate('2026-12-31')).toBe('31 Dec 2026');
    expect(formatShortDate('2026-09-10T00:00:00.000Z')).toBe('10 Sep');
    expect(formatMonth('2026-09-01T00:00:00.000Z')).toBe('September 2026');
    expect(formatMonthShort('2026-09-01')).toBe('Sep 2026');
    expect(formatDate(null)).toBe('-');
  });
  it('steps through months across year boundaries', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-09', 0)).toBe('2026-09');
    expect(formatYM('2026-03')).toBe('March 2026');
    expect(toYM('2026-09-01T00:00:00.000Z')).toBe('2026-09');
  });
  it('builds ISO dates from local dates', () => {
    expect(toISODate(new Date(2026, 8, 5))).toBe('2026-09-05');
  });
});

describe('greeting and initials', () => {
  it('greets by time of day', () => {
    expect(greeting(new Date(2026, 0, 1, 9))).toBe('Good morning');
    expect(greeting(new Date(2026, 0, 1, 14))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 0, 1, 20))).toBe('Good evening');
  });
  it('takes up to two initials', () => {
    expect(initials('Rahul Sharma')).toBe('RS');
    expect(initials('priya')).toBe('P');
    expect(initials('Amit Kumar Singh')).toBe('AK');
  });
});
