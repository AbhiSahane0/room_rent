import { BadRequestException } from '@nestjs/common';

/**
 * Pure billing maths. All arithmetic is done in integer paise (1/100 rupee) so that
 * totals never suffer floating point drift, then converted back to rupees with 2 decimals.
 */
export const toPaise = (rupees: number) => Math.round(rupees * 100);
export const fromPaise = (paise: number) => paise / 100;

export type ElectricityMode = 'METER' | 'FIXED' | 'NONE';

export interface ElectricityInput {
  mode: ElectricityMode;
  previousReading?: number;
  currentReading?: number;
  ratePerUnit?: number;
  fixedAmount?: number;
  /** Manual amount (e.g. faulty meter). Replaces the calculated amount. */
  overrideAmount?: number;
}

export interface ElectricityResult {
  mode: ElectricityMode;
  previousReading: number | null;
  currentReading: number | null;
  units: number;
  ratePerUnit: number | null;
  calculatedAmount: number;
  amount: number;
  isOverride: boolean;
}

export function calculateElectricity(input: ElectricityInput): ElectricityResult {
  if (input.overrideAmount != null && input.overrideAmount < 0) throw new BadRequestException('Electricity amount cannot be negative');

  if (input.mode === 'NONE') {
    const amount = input.overrideAmount ?? 0;
    return { mode: 'NONE', previousReading: null, currentReading: null, units: 0, ratePerUnit: null, calculatedAmount: 0, amount, isOverride: input.overrideAmount != null };
  }

  if (input.mode === 'FIXED') {
    const calculated = input.fixedAmount ?? 0;
    const amount = input.overrideAmount ?? calculated;
    return { mode: 'FIXED', previousReading: null, currentReading: null, units: 0, ratePerUnit: null, calculatedAmount: calculated, amount: fromPaise(toPaise(amount)), isOverride: input.overrideAmount != null };
  }

  // METER
  const previous = input.previousReading ?? 0;
  const rate = input.ratePerUnit ?? 0;
  if (input.currentReading == null) {
    if (input.overrideAmount == null) throw new BadRequestException('Enter the current meter reading');
    return { mode: 'METER', previousReading: previous, currentReading: null, units: 0, ratePerUnit: rate, calculatedAmount: 0, amount: input.overrideAmount, isOverride: true };
  }
  if (input.currentReading < 0) throw new BadRequestException('Meter reading cannot be negative');
  if (input.currentReading < previous) {
    throw new BadRequestException(`Current reading (${input.currentReading}) cannot be lower than the previous reading (${previous})`);
  }
  const unitsHundredths = Math.round((input.currentReading - previous) * 100);
  const calculatedPaise = Math.round((unitsHundredths * toPaise(rate)) / 100);
  const amountPaise = input.overrideAmount != null ? toPaise(input.overrideAmount) : calculatedPaise;
  return {
    mode: 'METER',
    previousReading: previous,
    currentReading: input.currentReading,
    units: unitsHundredths / 100,
    ratePerUnit: rate,
    calculatedAmount: fromPaise(calculatedPaise),
    amount: fromPaise(amountPaise),
    isOverride: input.overrideAmount != null,
  };
}

export interface BillInput {
  rent: number;
  electricity: number;
  charges: { amount: number }[];
  lateFee?: number;
  discount?: number;
  previousBalance?: number;
}

export interface BillTotals {
  rent: number;
  electricity: number;
  otherCharges: number;
  lateFee: number;
  discount: number;
  /** Charges for this month only: rent + electricity + other + late fee - discount. */
  subtotal: number;
  previousBalance: number;
  totalDue: number;
}

export function calculateBill(input: BillInput): BillTotals {
  const rent = toPaise(input.rent);
  const electricity = toPaise(input.electricity);
  const other = input.charges.reduce((sum, c) => sum + toPaise(c.amount), 0);
  const lateFee = toPaise(input.lateFee ?? 0);
  const discount = toPaise(input.discount ?? 0);
  const previous = toPaise(input.previousBalance ?? 0);

  for (const [label, v] of [['Rent', rent], ['Electricity', electricity], ['Charge', other], ['Late fee', lateFee], ['Discount', discount], ['Previous balance', previous]] as const) {
    if (v < 0) throw new BadRequestException(`${label} cannot be negative`);
  }
  const gross = rent + electricity + other + lateFee + previous;
  if (discount > gross) throw new BadRequestException('Discount cannot be more than the total amount due');

  return {
    rent: fromPaise(rent),
    electricity: fromPaise(electricity),
    otherCharges: fromPaise(other),
    lateFee: fromPaise(lateFee),
    discount: fromPaise(discount),
    subtotal: fromPaise(rent + electricity + other + lateFee - discount),
    previousBalance: fromPaise(previous),
    totalDue: fromPaise(gross - discount),
  };
}

/** Rent in force for a billing month: the latest change effective on or before the month start. */
export function rentForPeriod(history: { amount: number; effectiveFrom: Date }[], periodStart: Date, fallback: number): number {
  const applicable = history.filter((h) => h.effectiveFrom <= periodStart).sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];
  return applicable ? applicable.amount : fallback;
}

export type PaymentStatus = 'GENERATED' | 'PARTIALLY_PAID' | 'PAID';

export function statusAfterPayment(totalDue: number, paid: number): PaymentStatus {
  const due = toPaise(totalDue);
  const p = toPaise(paid);
  if (p <= 0) return 'GENERATED';
  return p >= due ? 'PAID' : 'PARTIALLY_PAID';
}
