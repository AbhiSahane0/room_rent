import * as ExcelJS from 'exceljs';

export interface SheetRow {
  month: string; // YYYY-MM
  room: string;
  name: string;
  rent: number;
  personalElectricity: number;
  societyElectricity: number;
  societyMaintenance: number;
  outstanding: number;
  total: number | null;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const NOT_A_TENANT = /no\s*tenant|under construction|own house|^tenant name$/i;

const cellValue = (v: ExcelJS.CellValue): unknown => (v && typeof v === 'object' && 'result' in v ? (v as ExcelJS.CellFormulaValue).result : v);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : 0);
const clean = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** Accepts real dates and spreadsheet text such as "Aug-26" or "Sep 17". Returns YYYY-MM or null. */
export function parseMonth(v: unknown): string | null {
  if (v instanceof Date) return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}`;
  const m = /^([A-Za-z]{3})[a-z]*[-\s'](\d{2,4})$/.exec(clean(v));
  if (!m || !MONTHS[m[1].toLowerCase()]) return null;
  const year = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  return `${year}-${String(MONTHS[m[1].toLowerCase()]).padStart(2, '0')}`;
}

/** "Vishal Gopane - 20" and "Vishal Gopane 15" are the same person with a rent note appended in the sheet. */
export const baseName = (name: string) => clean(name).replace(/[-\s]*\d+$/, '').trim().toLowerCase();

/**
 * Reads the "Billing" sheet: repeating blocks, one per month, columns = rooms.
 * Handles the two label styles used over the years ("Outstanding :" and "Deposit Pending").
 */
export async function parseBillingSheet(file: string): Promise<SheetRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet('Billing');
  if (!ws) throw new Error('This workbook has no "Billing" sheet.');

  const rows: SheetRow[] = [];
  for (let r = 1; r <= ws.rowCount; r++) {
    if (clean(cellValue(ws.getCell(r, 2).value)).toLowerCase() !== 'tenant name') continue;
    const label: Record<string, number> = {};
    for (let k = r; k < r + 12 && k <= ws.rowCount; k++) {
      const l = clean(cellValue(ws.getCell(k, 2).value)).replace(/:$/, '').trim().toLowerCase();
      if (l && label[l] === undefined) label[l] = k;
    }
    if (!label['room no'] || !label['month'] || !label['monthly rental']) continue;
    const get = (key: string[], c: number) => {
      const k = key.map((x) => label[x]).find((x) => x !== undefined);
      return k ? cellValue(ws.getCell(k, c).value) : undefined;
    };
    for (let c = 3; c <= 12; c++) {
      const name = clean(cellValue(ws.getCell(r, c).value));
      const month = parseMonth(cellValue(ws.getCell(label['month'], c).value));
      const room = clean(cellValue(ws.getCell(label['room no'], c).value));
      if (!name || !month || !room || NOT_A_TENANT.test(name)) continue;
      const total = get(['monthly payment'], c);
      rows.push({
        month,
        room,
        name,
        rent: num(get(['monthly rental'], c)),
        personalElectricity: num(get(['personal electricity'], c)),
        societyElectricity: num(get(['society electricity', 'monthly society'], c)),
        societyMaintenance: num(get(['society maintenance'], c)),
        outstanding: num(get(['outstanding', 'deposit pending'], c)),
        total: total === undefined ? null : num(total),
      });
    }
  }
  return rows;
}

export interface CurrentTenant extends SheetRow {
  /** First month of this person's unbroken stay in the room (approximate: the sheet's month labels contain typos). */
  since: string;
}

/** The most recent month's tenants, each with their move-in month inferred from earlier blocks. */
export function currentTenants(rows: SheetRow[]): { month: string; tenants: CurrentTenant[] } {
  if (rows.length === 0) throw new Error('No tenant rows found in the Billing sheet.');
  const month = rows.map((r) => r.month).sort().at(-1)!;
  const tenants = rows
    .filter((r) => r.month === month && r.rent > 0)
    .map((r) => {
      // Blocks are in chronological order in the sheet, but month labels contain typos, so walk by position.
      const history = rows.filter((x) => x.room === r.room);
      let i = history.lastIndexOf(r);
      let since = r.month;
      while (i >= 0 && baseName(history[i].name) === baseName(r.name)) {
        since = history[i].month;
        i--;
      }
      return { ...r, since };
    });
  return { month, tenants };
}
