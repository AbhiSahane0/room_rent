import { SheetRow } from '../prisma-seed/excel-parser';
import { buildHistoryPlan, fixMonths } from '../prisma-seed/history-plan';

let block = 0;
/** One monthly block with the given people. */
export const rows = (month: string, people: Partial<SheetRow>[]): SheetRow[] => {
  const b = block++;
  return people.map((p) => ({
    month, room: '1', name: 'A', rent: 5000, personalElectricity: 100, societyElectricity: 200, societyMaintenance: 0, outstanding: 0, total: null, kind: 'arrears' as const, block: b, ...p,
  }));
};
const tenant = (plan: ReturnType<typeof buildHistoryPlan>, name: string) => plan.tenants.find((t) => t.name === name)!;
const entries = (plan: ReturnType<typeof buildHistoryPlan>, name: string) => tenant(plan, name).stints.flatMap((s) => s.entries);

describe('history plan', () => {
  beforeEach(() => { block = 0; });

  it('derives each payment from the balance the sheet carries into the next month', () => {
    const plan = buildHistoryPlan([
      ...rows('2026-05', [{ name: 'Asha' }]), // total 5300
      ...rows('2026-06', [{ name: 'Asha', outstanding: 800 }]), // 800 of May unpaid -> 4500 paid
      ...rows('2026-07', [{ name: 'Asha' }]), // June fully paid
    ]);
    const [may, june, july] = entries(plan, 'Asha');
    expect([may.total, may.paid]).toEqual([5300, 4500]);
    expect([june.carried, june.total, june.paid]).toEqual([800, 6100, 6100]);
    expect([july.total, july.paid]).toEqual([5300, 0]); // the latest month is billed but unpaid
  });

  it('keeps bill totals equal to the sheet, itemising any difference as an adjustment', () => {
    const plan = buildHistoryPlan([...rows('2026-06', [{ name: 'Asha' }]), ...rows('2026-07', [{ name: 'Asha', outstanding: 0, total: 5600 }])]);
    const july = entries(plan, 'Asha')[1];
    expect([july.total, july.adjustment]).toEqual([5600, 300]);
  });

  it('turns a negative Outstanding into an advance credit and a negative charge into a deposit adjustment', () => {
    const plan = buildHistoryPlan([
      ...rows('2026-06', [{ name: 'Asha' }]),
      ...rows('2026-07', [{ name: 'Asha', outstanding: -200 }]),
      ...rows('2026-08', [{ name: 'Asha', societyMaintenance: -3000, outstanding: 500 }]),
    ]);
    const [, july, aug] = entries(plan, 'Asha');
    expect([july.credit, july.total]).toEqual([200, 5100]);
    expect([aug.deposit, aug.carried]).toEqual([3000, 500]);
    expect(aug.total).toBe(5000 + 100 + 200 + 500 - 3000);
  });

  it('never produces a negative bill', () => {
    const plan = buildHistoryPlan([...rows('2026-06', [{ name: 'Asha' }]), ...rows('2026-07', [{ name: 'Asha', total: -318, outstanding: -6000 }])]);
    expect(entries(plan, 'Asha')[1].total).toBe(0);
  });

  it('leaves dues with a tenant who moved out only when the last row already carried arrears', () => {
    const plan = buildHistoryPlan([
      ...rows('2026-05', [{ name: 'Left Clean', room: '1' }, { name: 'Left Owing', room: '2' }, { name: 'Stays', room: '3' }]),
      ...rows('2026-06', [{ name: 'Left Owing', room: '2', outstanding: 1000 }, { name: 'Stays', room: '3' }]),
      ...rows('2026-07', [{ name: 'Stays', room: '3' }]),
    ]);
    expect(tenant(plan, 'Left Clean').due).toBe(0);
    expect(tenant(plan, 'Left Owing').due).toBe(5300 + 1000 - 0); // June total 6300 stays unpaid
    expect(tenant(plan, 'Stays').stints[0].current).toBe(true);
  });

  it('corrects mislabelled months from block order and counts a copied block once', () => {
    const input = [
      ...rows('2022-11', [{ name: 'A' }]), ...rows('2022-12', [{ name: 'A' }]), ...rows('2022-01', [{ name: 'A' }]), // really Jan 2023
      ...rows('2023-02', [{ name: 'A' }]),
    ];
    const copy = rows('2023-03', [{ name: 'A' }]);
    const dup = copy.map((r) => ({ ...r, block: block++ }));
    const fixed = fixMonths([...input, ...copy, ...dup]);
    expect([...new Set(fixed.rows.map((r) => r.month))]).toEqual(['2022-11', '2022-12', '2023-01', '2023-02', '2023-03']);
    expect(fixed.duplicates).toEqual(['2023-03']);
  });

  it('treats name suffixes and aliases as one person and merges room typos', () => {
    const plan = buildHistoryPlan(
      [...rows('2026-05', [{ name: 'Torage - 1', room: '3' }]), ...rows('2026-06', [{ name: 'Torange', room: '3' }]), ...rows('2026-07', [{ name: 'Souran Paul', room: '5400' }])],
      { roomAliases: { '5400': 'SHOP 1' } },
    );
    expect(plan.tenants.map((t) => t.name).sort()).toEqual(['Souran Paul', 'Torange']);
    expect(plan.rooms.map((r) => r.number)).toEqual(['3', 'SHOP 1']);
  });

  it('starts a new stay when the same person returns to another room', () => {
    const plan = buildHistoryPlan([...rows('2026-05', [{ name: 'Asha', room: '1' }]), ...rows('2026-06', [{ name: 'Asha', room: '2' }])]);
    expect(tenant(plan, 'Asha').stints.map((s) => s.room)).toEqual(['1', '2']);
  });
});
