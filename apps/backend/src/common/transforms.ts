import { Transform } from 'class-transformer';

export const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
/** Strips spaces and dashes so "98765 43210" and "98765-43210" are stored consistently. */
export const NormalizePhone = () => Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value));
export const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
