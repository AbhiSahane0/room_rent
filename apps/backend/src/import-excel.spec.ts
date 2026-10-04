import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { baseName, currentTenants, parseBillingSheet, parseMonth } from '../prisma-seed/excel-parser';

const LABELS = ['Tenant Name', 'Room No', 'Month', 'Monthly Rental ', 'Personal Electricity ', 'Society Electricity', 'Society Maintenance', 'Outstanding :', 'Monthly Payment :'];

/** Builds a workbook shaped like the owner's register, with invented people. */
async function fixture() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Billing');
  const block = (top: number, month: string | Date, people: { name: string; room: string | number; rent: number; pe: number; out: number }[]) => {
    LABELS.forEach((l, i) => (ws.getCell(top + i, 2).value = l));
    people.forEach((p, i) => {
      const c = 3 + i;
      ws.getCell(top, c).value = p.name;
      ws.getCell(top + 1, c).value = p.room;
      ws.getCell(top + 2, c).value = month;
      ws.getCell(top + 3, c).value = p.rent;
      ws.getCell(top + 4, c).value = p.pe;
      ws.getCell(top + 5, c).value = 200;
      ws.getCell(top + 6, c).value = 0;
      ws.getCell(top + 7, c).value = p.out;
      ws.getCell(top + 8, c).value = { formula: 'SUM(1,2)', result: p.rent + p.pe + 200 + p.out };
    });
  };
  block(2, new Date(Date.UTC(2026, 5, 1)), [{ name: 'Old Owner 15', room: 1, rent: 5000, pe: 100, out: 0 }, { name: 'No Tenant', room: 'L-7', rent: 0, pe: 0, out: 0 }]);
  block(12, 'Jul-26', [{ name: 'Asha Patil', room: 1, rent: 6000, pe: 120, out: 0 }, { name: 'Ravi Kale', room: 'L-7', rent: 6600, pe: 60, out: 0 }]);
  block(22, 'Aug-26', [{ name: 'Asha Patil', room: 1, rent: 6000, pe: 240, out: 500 }, { name: 'Ravi Kale', room: 'L-7', rent: 6600, pe: 72, out: -148 }]);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rent-')), 'fixture.xlsx');
  await wb.xlsx.writeFile(file);
  return file;
}

describe('Excel register import (parser)', () => {
  it('understands the month formats used in the sheet', () => {
    expect(parseMonth(new Date(Date.UTC(2026, 7, 1)))).toBe('2026-08');
    expect(parseMonth('Aug-26')).toBe('2026-08');
    expect(parseMonth('Sep 17')).toBe('2017-09');
    expect(parseMonth('nonsense')).toBeNull();
  });

  it('treats name suffixes like "- 20" and "15" as notes, not a different person', () => {
    expect(baseName('Vishal Gopane - 20')).toBe(baseName('Vishal Gopane'));
    expect(baseName('V N Swami 15')).toBe('v n swami');
    expect(baseName('Maruti Turerao')).not.toBe(baseName('Torange'));
  });

  it('reads the latest month, skips empty rooms, and keeps formula results as the sheet total', async () => {
    const rows = await parseBillingSheet(await fixture());
    expect(rows.some((r) => /no tenant/i.test(r.name))).toBe(false);
    const { month, tenants } = currentTenants(rows);
    expect(month).toBe('2026-08');
    expect(tenants.map((t) => [t.room, t.name, t.rent, t.personalElectricity, t.societyElectricity, t.outstanding, t.total])).toEqual([
      ['1', 'Asha Patil', 6000, 240, 200, 500, 6940],
      ['L-7', 'Ravi Kale', 6600, 72, 200, -148, 6724],
    ]);
  });

  it('infers move-in from the unbroken run of the same person in the room', async () => {
    const { tenants } = currentTenants(await parseBillingSheet(await fixture()));
    expect(tenants.find((t) => t.room === '1')!.since).toBe('2026-07'); // the previous occupant is a different person
    expect(tenants.find((t) => t.room === 'L-7')!.since).toBe('2026-07');
  });

  it('rejects a workbook without a Billing sheet', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Other');
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rent-')), 'x.xlsx');
    await wb.xlsx.writeFile(file);
    await expect(parseBillingSheet(file)).rejects.toThrow(/Billing/);
  });
});
