/**
 * Turns the owner's Billing sheet (one block per month, 2017 onwards) into a plan the importer can write:
 * who lived where and when, what each month's bill contained, and what was paid.
 *
 * The sheet records what was billed and the unpaid balance carried into the next month, but not the payments
 * themselves. A payment is therefore derived: paid = this month's total - the balance the sheet carries forward.
 * Every difference between the app's arithmetic and the sheet's own total becomes an explicit
 * "as per register" adjustment, so each imported bill total equals the sheet.
 *
 * Pure functions only: no database, easy to test.
 */
import { baseName, SheetRow } from './excel-parser';

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const monthIndex = (m: string) => {
  const [y, mm] = m.split('-').map(Number);
  return y * 12 + (mm - 1);
};
const fromIndex = (i: number) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
const addMonths = (m: string, n: number) => fromIndex(monthIndex(m) + n);
const money = (n: number) => Math.round(n * 100) / 100;

/** Room labels in the sheet that are typos of another room. */
export const DEFAULT_ROOM_ALIASES: Record<string, string> = { '5400': 'SHOP 1', 'PR No 01': 'SHOP 1' };
/** Different spellings of the same person (keys are lower-case base names). */
export const DEFAULT_NAME_ALIASES: Record<string, string> = { torage: 'torange' };

export interface PlanEntry {
  month: string; // YYYY-MM
  room: string;
  rent: number;
  electricity: number;
  societyElectricity: number;
  societyMaintenance: number;
  /** Balance carried in from earlier bills of this tenant (after the payments below). */
  carried: number;
  /** Credit the sheet shows as a negative Outstanding (tenant had paid ahead). */
  credit: number;
  /** A negative amount in a charge column (e.g. -12000 under maintenance): a security deposit used against dues. */
  deposit: number;
  /** Signed correction so the bill total equals the sheet: positive adds a charge, negative a discount. */
  adjustment: number;
  /** Final bill total (equals the sheet's Monthly Payment). */
  total: number;
  /** Payment recorded against this bill (0 = none). */
  paid: number;
  /** Where the arithmetic had to be forced to match the sheet. */
  note?: string;
}

export interface PlanStint {
  room: string;
  entries: PlanEntry[];
  /** Still living in the room in the sheet's last month. */
  current: boolean;
}

export interface PlanTenant {
  key: string;
  name: string;
  stints: PlanStint[];
  /** Owed when the sheet ends. */
  due: number;
  openingBalance: number;
}

export interface HistoryPlan {
  firstMonth: string;
  lastMonth: string;
  tenants: PlanTenant[];
  rooms: { number: string; latestRent: number; occupied: boolean }[];
  warnings: string[];
  stats: { bills: number; payments: number; adjustments: number; adjustmentTotal: number; monthsFixed: number };
}

export interface PlanOptions {
  roomAliases?: Record<string, string>;
  nameAliases?: Record<string, string>;
  /** A gap longer than this many months between a tenant's rows in the same room starts a new stay. */
  maxGapMonths?: number;
}

/**
 * Repairs month labels using block order: the sheet runs in time order, but a few labels are wrong
 * (e.g. January and February 2023 typed as 2022). A block that is not later than the one before it is
 * moved to the next month after it.
 */
export function fixMonths(all: SheetRow[]): { rows: SheetRow[]; fixed: { from: string; to: string }[]; duplicates: string[] } {
  // A block copied twice (identical label and numbers) is one month, not two.
  const sig = (b: number) => JSON.stringify(all.filter((r) => r.block === b).map((r) => [r.month, r.room, r.name, r.rent, r.personalElectricity, r.societyElectricity, r.societyMaintenance, r.outstanding, r.total]));
  const allBlocks = [...new Set(all.map((r) => r.block))].sort((a, b) => a - b);
  const dropped = new Set<number>();
  const duplicates: string[] = [];
  allBlocks.forEach((b, i) => {
    if (i > 0 && sig(b) === sig(allBlocks[i - 1])) {
      dropped.add(b);
      duplicates.push(all.find((r) => r.block === b)!.month);
    }
  });
  const rows = all.filter((r) => !dropped.has(r.block));
  const blocks = [...new Set(rows.map((r) => r.block))].sort((a, b) => a - b);
  const monthOf = new Map<number, string>();
  const fixed: { from: string; to: string }[] = [];
  let prev: string | null = null;
  for (const b of blocks) {
    const label = rows.find((r) => r.block === b)!.month;
    let m = label;
    if (prev && monthIndex(label) <= monthIndex(prev)) {
      m = addMonths(prev, 1);
      fixed.push({ from: label, to: m });
    }
    monthOf.set(b, m);
    prev = m;
  }
  return { rows: rows.map((r) => ({ ...r, month: monthOf.get(r.block)! })), fixed, duplicates };
}

const display = (name: string) => clean(name).replace(/[-\s]*\d+$/, '').trim();

export function buildHistoryPlan(input: SheetRow[], opts: PlanOptions = {}): HistoryPlan {
  const roomAliases = { ...DEFAULT_ROOM_ALIASES, ...opts.roomAliases };
  const nameAliases = { ...DEFAULT_NAME_ALIASES, ...opts.nameAliases };
  const maxGap = opts.maxGapMonths ?? 3;
  const warnings: string[] = [];

  const { rows: fixedRows, fixed, duplicates } = fixMonths(input);
  for (const d of duplicates) warnings.push(`The ${d} block appears twice with identical numbers; counted once.`);
  for (const f of fixed) warnings.push(`Month label ${f.from} is out of order in the sheet; treated as ${f.to}.`);
  const lastMonth = fixedRows.reduce((m, r) => (r.month > m ? r.month : m), fixedRows[0].month);
  const firstMonth = fixedRows.reduce((m, r) => (r.month < m ? r.month : m), fixedRows[0].month);

  // Group rows per person.
  const people = new Map<string, { name: string; rows: (SheetRow & { room: string })[] }>();
  for (const r of fixedRows) {
    const room = roomAliases[r.room] ?? r.room;
    const b = baseName(r.name);
    const key = nameAliases[b] ?? b;
    const p = people.get(key) ?? { name: display(r.name), rows: [] };
    p.rows.push({ ...r, room });
    people.set(key, p);
  }

  const tenants: PlanTenant[] = [];
  let adjustments = 0;
  let adjustmentTotal = 0;

  for (const [key, person] of people) {
    // Latest spelling wins for the display name.
    person.name = display(person.rows[person.rows.length - 1].name);
    const sorted = [...person.rows].sort((a, b) => a.month.localeCompare(b.month) || a.room.localeCompare(b.room));
    // Rows with nothing to bill (free months) are skipped.
    const rowsToBill = sorted.filter((r) => r.rent + r.personalElectricity + r.societyElectricity + r.societyMaintenance !== 0 || r.total);

    const entries: PlanEntry[] = [];
    for (let i = 0; i < rowsToBill.length; i++) {
      const r = rowsToBill[i];
      const parts = [r.rent, r.personalElectricity, r.societyElectricity, r.societyMaintenance];
      const deposit = money(parts.filter((x) => x < 0).reduce((a, x) => a - x, 0));
      const [rent, electricity, societyElectricity, societyMaintenance] = parts.map((x) => Math.max(0, x));
      const comps = money(rent + electricity + societyElectricity + societyMaintenance);
      const prev = entries[i - 1];
      const out = r.kind === 'arrears' ? r.outstanding : 0;
      const credit = out < 0 ? -out : 0;

      let carried = 0;
      if (i === 0) {
        carried = Math.max(0, out); // owed before the register's first mention of this person: opening balance
      } else {
        // The sheet's Outstanding is what was still unpaid from the previous bill.
        const owedBefore = prev.total;
        const unpaid = r.kind === 'arrears' ? Math.min(owedBefore, Math.max(0, out)) : 0;
        prev.paid = money(owedBefore - unpaid);
        carried = money(unpaid);
      }
      const natural = money(comps + carried - credit - deposit);
      // A bill cannot be negative: a register total below zero means the tenant is in credit, which the next row's negative Outstanding already carries.
      const sheetTotal = money(r.total ?? comps - deposit + out);
      const target = Math.max(0, sheetTotal);
      const adjustment = money(target - natural);
      // A bill cannot discount more than it charges.
      if (credit + deposit + Math.max(0, -adjustment) > comps + carried + Math.max(0, adjustment) + 0.001) warnings.push(`${person.name} ${r.month}: discounts exceed the charges; check this bill.`);
      if (adjustment !== 0) {
        adjustments++;
        adjustmentTotal = money(adjustmentTotal + adjustment);
      }
      entries.push({
        month: r.month, room: r.room, rent, electricity, societyElectricity, societyMaintenance,
        carried, credit, deposit, adjustment, total: target, paid: 0,
        ...(adjustment !== 0 ? { note: sheetTotal < 0 ? `Register total was ${sheetTotal} (tenant in credit); billed as 0` : `Adjusted by ${adjustment} to match the register total ${target}` } : {}),
      });
    }

    // The last row of a tenant has no following row to tell us what was paid.
    const last = entries[entries.length - 1];
    const lastRow = rowsToBill[rowsToBill.length - 1];
    if (last) {
      const present = last.month === lastMonth;
      const hadArrears = lastRow.kind === 'arrears' && lastRow.outstanding > 0;
      last.paid = present || hadArrears ? 0 : last.total;
    }

    // Split into stays: a new room, or a long gap, starts a new stay.
    const stints: PlanStint[] = [];
    for (const e of entries) {
      const cur = stints[stints.length - 1];
      const gap = cur ? monthIndex(e.month) - monthIndex(cur.entries[cur.entries.length - 1].month) : 0;
      if (cur && cur.room === e.room && gap <= maxGap) cur.entries.push(e);
      else stints.push({ room: e.room, entries: [e], current: false });
    }
    for (const s of stints) s.current = s.entries[s.entries.length - 1].month === lastMonth;
    // Two stays that overlap in time cannot both be live; the earlier one ends first.
    for (let i = 1; i < stints.length; i++) {
      const a = stints[i - 1].entries;
      if (a[a.length - 1].month >= stints[i].entries[0].month) warnings.push(`${person.name} appears in two rooms in ${stints[i].entries[0].month}.`);
    }

    const due = last ? money(last.total - last.paid) : 0;
    const openingBalance = entries[0]?.carried ?? 0;
    tenants.push({ key, name: person.name, stints, due, openingBalance });
  }

  // Rooms: latest rent and whether someone lives there at the end.
  const roomNumbers = [...new Set(fixedRows.map((r) => roomAliases[r.room] ?? r.room))];
  const rooms = roomNumbers
    .map((number) => {
      const allEntries = tenants.flatMap((t) => t.stints.filter((s) => s.room === number));
      const latestEntry = allEntries.flatMap((s) => s.entries).sort((a, b) => b.month.localeCompare(a.month))[0];
      return { number, latestRent: latestEntry?.rent ?? 0, occupied: allEntries.some((s) => s.current) };
    })
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

  const bills = tenants.reduce((n, t) => n + t.stints.reduce((m, s) => m + s.entries.length, 0), 0);
  const payments = tenants.reduce((n, t) => n + t.stints.reduce((m, s) => m + s.entries.filter((e) => e.paid > 0).length, 0), 0);
  tenants.sort((a, b) => a.stints[0].entries[0].month.localeCompare(b.stints[0].entries[0].month) || a.name.localeCompare(b.name));
  return { firstMonth, lastMonth, tenants, rooms, warnings, stats: { bills, payments, adjustments, adjustmentTotal, monthsFixed: fixed.length } };
}
