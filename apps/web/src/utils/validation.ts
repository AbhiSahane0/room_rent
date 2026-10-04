import { z } from 'zod';

/** Required money amount typed as text; converted with toNumber() on submit. */
export const moneyString = (label = 'Amount') =>
  z.string().trim().min(1, `${label} is required`).regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount');
export const optionalMoneyString = z.string().trim().regex(/^(\d+(\.\d{1,2})?)?$/, 'Enter a valid amount');
export const toNumber = (s: string) => Number(s);
export const toOptionalNumber = (s?: string) => (s && s.trim() !== '' ? Number(s) : undefined);
export const optionalText = (max = 300) => z.string().trim().max(max);
export const orUndefined = (s?: string) => (s && s.trim() ? s.trim() : undefined);
