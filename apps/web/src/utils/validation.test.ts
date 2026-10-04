import { describe, expect, it } from 'vitest';
import { moneyString, optionalMoneyString, orUndefined, toNumber, toOptionalNumber } from './validation';

describe('money validation', () => {
  it('accepts whole and 2-decimal amounts only', () => {
    const s = moneyString('Rent');
    for (const ok of ['0', '8000', '8000.5', '8000.50']) expect(s.safeParse(ok).success).toBe(true);
    for (const bad of ['', '-5', '12.345', 'abc', '1,000', '₹500']) expect(s.safeParse(bad).success).toBe(false);
    expect(s.safeParse('').error?.issues[0].message).toBe('Rent is required');
  });
  it('allows optional amounts to be empty', () => {
    expect(optionalMoneyString.safeParse('').success).toBe(true);
    expect(optionalMoneyString.safeParse('12.5').success).toBe(true);
    expect(optionalMoneyString.safeParse('x').success).toBe(false);
  });
  it('converts text to numbers', () => {
    expect(toNumber('1200.50')).toBe(1200.5);
    expect(toOptionalNumber('')).toBeUndefined();
    expect(toOptionalNumber(undefined)).toBeUndefined();
    expect(toOptionalNumber('7')).toBe(7);
    expect(orUndefined('  hi ')).toBe('hi');
    expect(orUndefined('   ')).toBeUndefined();
  });
});
