import { BadRequestException } from '@nestjs/common';

/** Parses a YYYY-MM-DD string to a UTC-midnight Date (matches Postgres DATE columns). */
export function parseDate(value: string, label = 'Date'): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException(`${label} must be in YYYY-MM-DD format`);
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new BadRequestException(`${label} is not a valid date`);
  return d;
}

export const monthStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
export const todayUtc = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
};
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
