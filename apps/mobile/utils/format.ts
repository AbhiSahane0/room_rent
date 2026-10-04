/** Indian digit grouping: 150000 -> 1,50,000 (no Intl dependency, so it behaves the same on every device). */
export function formatINR(value: number | string | null | undefined, opts: { decimals?: boolean } = {}): string {
  const n = Number(value ?? 0);
  const neg = n < 0;
  const abs = Math.abs(n);
  const hasPaise = Math.round(abs * 100) % 100 !== 0;
  const fixed = abs.toFixed(opts.decimals || hasPaise ? 2 : 0);
  const [int, dec] = fixed.split('.');
  let out: string;
  if (int.length <= 3) out = int;
  else out = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + int.slice(-3);
  return `${neg ? '-' : ''}₹${out}${dec ? '.' + dec : ''}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** API dates are ISO strings; DATE columns are UTC midnight, so slice the calendar part instead of using local time. */
const parts = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { y, m, d };
};

export const formatDate = (iso?: string | null) => {
  if (!iso) return '-';
  const { y, m, d } = parts(iso);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
};
export const formatShortDate = (iso?: string | null) => {
  if (!iso) return '-';
  const { m, d } = parts(iso);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
};
export const formatMonth = (iso?: string | null) => {
  if (!iso) return '-';
  const { y, m } = parts(iso);
  return `${MONTHS_LONG[m - 1]} ${y}`;
};
export const formatMonthShort = (iso?: string | null) => {
  if (!iso) return '-';
  const { y, m } = parts(iso);
  return `${MONTHS[m - 1]} ${y}`;
};

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => toISODate(new Date());
/** First day of month as YYYY-MM-01 for a "YYYY-MM" or ISO date input. */
export const monthStart = (d: Date = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

export function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

/** "YYYY-MM" helpers for the billing month stepper. */
export const toYM = (iso: string) => iso.slice(0, 7);
export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
export const formatYM = (ym: string) => formatMonth(`${ym}-01`);
