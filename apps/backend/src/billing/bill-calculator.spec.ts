import { BadRequestException } from '@nestjs/common';
import { calculateBill, calculateElectricity, rentForPeriod, statusAfterPayment } from './bill-calculator';

describe('calculateElectricity', () => {
  it('computes units and amount from meter readings (spec example)', () => {
    const r = calculateElectricity({ mode: 'METER', previousReading: 1200, currentReading: 1350, ratePerUnit: 8 });
    expect(r).toMatchObject({ units: 150, ratePerUnit: 8, amount: 1200, calculatedAmount: 1200, isOverride: false });
  });

  it('handles fractional units and rates without float drift', () => {
    const r = calculateElectricity({ mode: 'METER', previousReading: 100.1, currentReading: 100.4, ratePerUnit: 7.35 });
    expect(r.units).toBe(0.3);
    expect(r.amount).toBe(2.21); // 0.30 * 7.35 = 2.205 -> 2.21
    expect(calculateElectricity({ mode: 'METER', previousReading: 0, currentReading: 0.1, ratePerUnit: 0.2 }).amount).toBe(0.02);
  });

  it('rejects a current reading below the previous reading', () => {
    expect(() => calculateElectricity({ mode: 'METER', previousReading: 1200, currentReading: 1199.99, ratePerUnit: 8 })).toThrow(BadRequestException);
    expect(() => calculateElectricity({ mode: 'METER', previousReading: 1200, currentReading: 1199, ratePerUnit: 8 })).toThrow(/cannot be lower than the previous reading \(1200\)/);
  });

  it('allows an equal reading (zero units)', () => {
    expect(calculateElectricity({ mode: 'METER', previousReading: 500, currentReading: 500, ratePerUnit: 8 }).amount).toBe(0);
  });

  it('requires a reading unless the amount is overridden manually', () => {
    expect(() => calculateElectricity({ mode: 'METER', previousReading: 10, ratePerUnit: 8 })).toThrow('Enter the current meter reading');
    const r = calculateElectricity({ mode: 'METER', previousReading: 10, ratePerUnit: 8, overrideAmount: 650 });
    expect(r).toMatchObject({ amount: 650, isOverride: true, units: 0 });
  });

  it('lets a manual override replace the calculated amount but still reports the calculation', () => {
    const r = calculateElectricity({ mode: 'METER', previousReading: 0, currentReading: 100, ratePerUnit: 8, overrideAmount: 700 });
    expect(r).toMatchObject({ calculatedAmount: 800, amount: 700, isOverride: true });
  });

  it('supports fixed and none modes', () => {
    expect(calculateElectricity({ mode: 'FIXED', fixedAmount: 500 })).toMatchObject({ amount: 500, units: 0, isOverride: false });
    expect(calculateElectricity({ mode: 'FIXED', fixedAmount: 500, overrideAmount: 450 })).toMatchObject({ amount: 450, isOverride: true });
    expect(calculateElectricity({ mode: 'NONE' }).amount).toBe(0);
  });

  it('rejects negative overrides and readings', () => {
    expect(() => calculateElectricity({ mode: 'FIXED', fixedAmount: 1, overrideAmount: -1 })).toThrow();
    expect(() => calculateElectricity({ mode: 'METER', previousReading: 0, currentReading: -5, ratePerUnit: 8 })).toThrow();
  });
});

describe('calculateBill', () => {
  it('matches the spec example: 8000 + 1200 + 500 + 200 = 9900', () => {
    const t = calculateBill({ rent: 8000, electricity: 1200, charges: [{ amount: 500 }, { amount: 200 }] });
    expect(t).toMatchObject({ rent: 8000, electricity: 1200, otherCharges: 700, subtotal: 9900, totalDue: 9900, previousBalance: 0 });
  });

  it('applies late fee, discount and previous balance: rent + electricity + other + late - discount + previous', () => {
    const t = calculateBill({ rent: 8000, electricity: 1200, charges: [{ amount: 500 }], lateFee: 100, discount: 300, previousBalance: 3900 });
    expect(t.subtotal).toBe(9500);
    expect(t.totalDue).toBe(13400);
  });

  it('is exact for awkward decimals', () => {
    const t = calculateBill({ rent: 0.1, electricity: 0.2, charges: [{ amount: 0.3 }] });
    expect(t.totalDue).toBe(0.6);
    expect(calculateBill({ rent: 1234.56, electricity: 78.9, charges: [{ amount: 10.01 }, { amount: 0.02 }] }).totalDue).toBe(1323.49);
  });

  it('rejects a discount larger than the amount due, and negatives', () => {
    expect(() => calculateBill({ rent: 1000, electricity: 0, charges: [], discount: 1000.01 })).toThrow('Discount cannot be more');
    expect(calculateBill({ rent: 1000, electricity: 0, charges: [], discount: 1000 }).totalDue).toBe(0);
    expect(() => calculateBill({ rent: -1, electricity: 0, charges: [] })).toThrow();
    expect(() => calculateBill({ rent: 1, electricity: 0, charges: [{ amount: -5 }] })).toThrow();
  });
});

describe('rentForPeriod (rent changes over time)', () => {
  const history = [
    { amount: 8000, effectiveFrom: new Date('2026-01-01') },
    { amount: 8500, effectiveFrom: new Date('2026-07-01') },
  ];
  it('uses the rent in force for each month, so old months keep old rent', () => {
    expect(rentForPeriod(history, new Date('2026-01-01'), 0)).toBe(8000);
    expect(rentForPeriod(history, new Date('2026-06-01'), 0)).toBe(8000);
    expect(rentForPeriod(history, new Date('2026-07-01'), 0)).toBe(8500);
    expect(rentForPeriod(history, new Date('2026-12-01'), 0)).toBe(8500);
  });
  it('falls back when there is no history', () => expect(rentForPeriod([], new Date('2026-01-01'), 7000)).toBe(7000));
});

describe('statusAfterPayment (partial payments)', () => {
  it('moves GENERATED -> PARTIALLY_PAID -> PAID', () => {
    expect(statusAfterPayment(10000, 0)).toBe('GENERATED');
    expect(statusAfterPayment(10000, 6000)).toBe('PARTIALLY_PAID');
    expect(statusAfterPayment(10000, 9999.99)).toBe('PARTIALLY_PAID');
    expect(statusAfterPayment(10000, 10000)).toBe('PAID');
  });
});
