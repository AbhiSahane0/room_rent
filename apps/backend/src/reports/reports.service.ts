import { Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { fromPaise, toPaise } from '../billing/bill-calculator';
import { monthLabel } from '../billing/bills.service';
import { todayUtc } from '../common/dates';
import { OUTSTANDING_BILL_WHERE } from '../common/outstanding';
import { PrismaService } from '../common/prisma.service';
import { PropertiesService } from '../properties/properties.service';

const MS_DAY = 86_400_000;

interface CollectionRow {
  start: Date;
  billed: { rent: number; electricity: number; other: number; expected: number; bills: number };
  collected: { amount: number; n: number };
  by_method: { method: PaymentMethod; amount: number; n: number }[];
  trend_billed: { ym: string; amount: number }[];
  trend_paid: { ym: string; amount: number }[];
}
const num = (d: Prisma.Decimal | number | null | undefined) => (d == null ? 0 : typeof d === 'number' ? d : d.toNumber());
const ymOf = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

export const currentMonth = () => ymOf(todayUtc());
const bounds = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 0)) };
};
export const shift = (ym: string, delta: number) => {
  const [y, m] = ym.split('-').map(Number);
  return ymOf(new Date(Date.UTC(y, m - 1 + delta, 1)));
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService, private readonly properties: PropertiesService) {}

  /** Runs `fn` for the user's properties. A named property is checked in parallel with the work (404 if it is not theirs), saving a round trip. */
  private async scoped<T>(userId: string, propertyId: string | undefined, fn: (ids: string[]) => Promise<T>): Promise<T> {
    if (!propertyId) return fn(await this.properties.ownedIds(userId));
    const [, result] = await Promise.all([this.properties.assertOwned(userId, propertyId), fn([propertyId])]);
    return result;
  }

  async scope(userId: string, propertyId?: string) {
    return propertyId ? [(await this.properties.assertOwned(userId, propertyId)).id] : this.properties.ownedIds(userId);
  }

  /** What was billed for the month, what came in during it, and what is still owed right now. */
  async collection(userId: string, q: { propertyId?: string; month?: string }) {
    return this.scoped(userId, q.propertyId, (ids) => this.collectionFor(ids, q.month));
  }

  /**
   * Same as `collection` for property ids the caller has already verified as the user's own.
   * The month (this month, unless nothing is billed yet: then the latest month with bills), what was billed, what came in,
   * how it was paid and the six-month trend are all worked out in ONE database query, so the whole report costs a single
   * network round trip (plus the outstanding balance, fetched in parallel, or passed in when the caller already has it).
   */
  async collectionFor(propertyIds: string[], requestedMonth?: string, pending?: Promise<number> | number) {
    const nowStart = ymOf(todayUtc()) + '-01';
    const reqStart = requestedMonth ? `${requestedMonth}-01` : null;
    const [rows, outstanding] = await Promise.all([
      this.prisma.$queryRaw<CollectionRow[]>`
        WITH r AS (
          SELECT s, ((s + interval '1 month')::date - 1) AS e, (s - interval '5 months')::date AS f
            FROM (SELECT COALESCE(
                    ${reqStart}::date,
                    (SELECT billing_period FROM bills WHERE property_id = ANY(${propertyIds}::uuid[]) AND status NOT IN ('CANCELLED', 'DRAFT') AND billing_period <= ${nowStart}::date ORDER BY billing_period DESC LIMIT 1),
                    ${nowStart}::date) AS s) m
        )
        SELECT r.s AS start,
          (SELECT row_to_json(x) FROM (
             SELECT COALESCE(SUM(rent_amount), 0) AS rent, COALESCE(SUM(electricity_amount), 0) AS electricity, COALESCE(SUM(other_charges_amount), 0) AS other,
                    COALESCE(SUM(total_due - previous_balance), 0) AS expected, COUNT(*)::int AS bills
               FROM bills WHERE property_id = ANY(${propertyIds}::uuid[]) AND status NOT IN ('CANCELLED', 'DRAFT') AND billing_period = r.s) x) AS billed,
          (SELECT row_to_json(x) FROM (
             SELECT COALESCE(SUM(p.amount), 0) AS amount, COUNT(*)::int AS n
               FROM payments p JOIN bills b ON b.id = p.bill_id WHERE b.property_id = ANY(${propertyIds}::uuid[]) AND p.payment_date BETWEEN r.s AND r.e) x) AS collected,
          (SELECT COALESCE(json_agg(x), '[]'::json) FROM (
             SELECT p.method::text AS method, SUM(p.amount) AS amount, COUNT(*)::int AS n
               FROM payments p JOIN bills b ON b.id = p.bill_id WHERE b.property_id = ANY(${propertyIds}::uuid[]) AND p.payment_date BETWEEN r.s AND r.e GROUP BY p.method) x) AS by_method,
          (SELECT COALESCE(json_agg(x), '[]'::json) FROM (
             SELECT to_char(billing_period, 'YYYY-MM') AS ym, SUM(total_due - previous_balance) AS amount
               FROM bills WHERE property_id = ANY(${propertyIds}::uuid[]) AND status NOT IN ('CANCELLED', 'DRAFT') AND billing_period BETWEEN r.f AND r.e GROUP BY 1) x) AS trend_billed,
          (SELECT COALESCE(json_agg(x), '[]'::json) FROM (
             SELECT to_char(p.payment_date, 'YYYY-MM') AS ym, SUM(p.amount) AS amount
               FROM payments p JOIN bills b ON b.id = p.bill_id WHERE b.property_id = ANY(${propertyIds}::uuid[]) AND p.payment_date BETWEEN r.f AND r.e GROUP BY 1) x) AS trend_paid
        FROM r`,
      pending !== undefined ? pending : this.totalOutstanding(propertyIds),
    ]);
    const row = rows[0];
    const month = ymOf(row.start);
    const { start } = bounds(month);
    const months = Array.from({ length: 6 }, (_, i) => shift(month, i - 5));
    const at = (list: { ym: string; amount: number }[], ym: string) => num(list.find((r) => r.ym === ym)?.amount);
    const collected = num(row.collected.amount);
    const expected = num(row.billed.expected);
    return {
      /** What this month's bills are made of (rent, electricity, other charges), excluding carried-over arrears. */
      composition: { rent: num(row.billed.rent), electricity: num(row.billed.electricity), other: num(row.billed.other), bills: row.billed.bills },
      month,
      monthLabel: monthLabel(start),
      expected,
      collected,
      paymentCount: row.collected.n,
      pending: outstanding,
      collectionRate: expected > 0 ? Math.min(1, collected / expected) : 0,
      byMethod: row.by_method.map((m) => ({ method: m.method, amount: num(m.amount), count: m.n })).sort((a, b) => b.amount - a.amount),
      trend: months.map((ym) => ({ month: ym, label: monthLabel(bounds(ym).start).slice(0, 3), expected: at(row.trend_billed, ym), collected: at(row.trend_paid, ym) })),
    };
  }

  private async openBills(propertyIds: string[]) {
    const bills = await this.prisma.bill.findMany({
      relationLoadStrategy: 'join',
      where: { propertyId: { in: propertyIds }, ...OUTSTANDING_BILL_WHERE },
      select: {
        id: true, tenantId: true, billNumber: true, dueDate: true, totalDue: true, paidAmount: true, roomId: true, status: true,
        tenant: { select: { id: true, fullName: true, phone: true, status: true } }, room: { select: { roomNumber: true } },
      },
    });
    return bills.map((b) => ({ ...b, balance: fromPaise(toPaise(num(b.totalDue)) - toPaise(num(b.paidAmount))) })).filter((b) => b.balance > 0);
  }

  async totalOutstanding(propertyIds: string[]) {
    const open = await this.openBills(propertyIds);
    return fromPaise(open.reduce((s, b) => s + toPaise(b.balance), 0));
  }

  async outstanding(userId: string, q: { propertyId?: string }) {
    return this.scoped(userId, q.propertyId, (ids) => this.outstandingFor(ids));
  }

  async outstandingFor(propertyIds: string[]) {
    const open = await this.openBills(propertyIds);
    const today = todayUtc();
    const byTenant = new Map<string, { balance: number; oldestDue: Date; billCount: number; billId: string; roomId: string; tenant: (typeof open)[number]['tenant']; roomNumber: string }>();
    for (const b of open) {
      const cur = byTenant.get(b.tenantId);
      byTenant.set(b.tenantId, {
        balance: fromPaise(toPaise(cur?.balance ?? 0) + toPaise(b.balance)),
        oldestDue: cur && cur.oldestDue < b.dueDate ? cur.oldestDue : b.dueDate,
        billCount: (cur?.billCount ?? 0) + 1,
        billId: b.id,
        roomId: b.roomId,
        tenant: b.tenant,
        roomNumber: b.room.roomNumber,
      });
    }
    const items = [...byTenant.values()]
      .map((v) => {
        const t = v.tenant;
        const overdueDays = Math.max(0, Math.floor((today.getTime() - v.oldestDue.getTime()) / MS_DAY));
        return {
          tenantId: t.id, fullName: t.fullName, phone: t.phone, tenantStatus: t.status,
          roomNumber: v.roomNumber ?? '-',
          balance: v.balance, billId: v.billId, billCount: v.billCount, dueDate: v.oldestDue, overdueDays,
        };
      })
      .sort((a, b) => b.balance - a.balance);
    // Who owes it, and how late: lets the dashboard separate current tenants from people who have moved out.
    const sumBills = (list: typeof open) => fromPaise(list.reduce((s, b) => s + toPaise(b.balance), 0));
    const tenantsIn = (list: typeof open) => new Set(list.map((b) => b.tenantId)).size;
    const former = open.filter((b) => b.tenant.status !== 'ACTIVE');
    const current = open.filter((b) => b.tenant.status === 'ACTIVE');
    const overdue = open.filter((b) => b.dueDate < today);
    const dueSoon = open.filter((b) => b.dueDate >= today && b.dueDate.getTime() - today.getTime() <= 7 * MS_DAY);
    const oldest = former.reduce<Date | null>((m, b) => (!m || b.dueDate < m ? b.dueDate : m), null);
    const stats = {
      currentTenants: { amount: sumBills(current), count: tenantsIn(current) },
      formerTenants: { amount: sumBills(former), count: tenantsIn(former), oldestDue: oldest },
      overdue: { amount: sumBills(overdue), count: tenantsIn(overdue) },
      dueSoon: { amount: sumBills(dueSoon), count: tenantsIn(dueSoon) },
    };
    return { total: fromPaise(items.reduce((s, i) => s + toPaise(i.balance), 0)), count: items.length, items, stats };
  }

  /** Smaller numbers the Home screen shows next to the big ones. All run in parallel with the other dashboard queries. */
  async extrasFor(propertyIds: string[]) {
    const today = todayUtc();
    const thisMonth = shift(ymOf(today), -1); // the month whose bills are being prepared now (last month's readings)
    const week = new Date(today.getTime() - 6 * MS_DAY);
    const inProperty = { room: { propertyId: { in: propertyIds } } };
    const [rentRoll, lastWeek, recent, toBill] = await Promise.all([
      this.prisma.roomAssignment.aggregate({ where: { status: 'ACTIVE', ...inProperty }, _sum: { agreedRent: true }, _count: true }),
      this.prisma.payment.aggregate({ where: { bill: { propertyId: { in: propertyIds } }, paymentDate: { gte: week, lte: today } }, _sum: { amount: true }, _count: true }),
      this.prisma.payment.findMany({
        relationLoadStrategy: 'join',
        where: { bill: { propertyId: { in: propertyIds } } },
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        select: { id: true, amount: true, paymentDate: true, method: true, billId: true, tenant: { select: { id: true, fullName: true } }, bill: { select: { room: { select: { roomNumber: true } } } } },
      }),
      this.prisma.roomAssignment.count({ where: { status: 'ACTIVE', ...inProperty, bills: { none: { billingPeriod: bounds(thisMonth).start, status: { notIn: ['CANCELLED'] } } } } }),
    ]);
    return {
      rentRoll: { monthly: num(rentRoll._sum.agreedRent), tenants: rentRoll._count },
      last7Days: { amount: num(lastWeek._sum.amount), count: lastWeek._count },
      recentPayments: recent.map((p) => ({ id: p.id, amount: num(p.amount), paymentDate: p.paymentDate, method: p.method, billId: p.billId, tenantId: p.tenant.id, tenantName: p.tenant.fullName, roomNumber: p.bill.room.roomNumber })),
      toBill: { month: thisMonth, monthLabel: monthLabel(bounds(thisMonth).start), count: toBill },
    };
  }

  async occupancy(userId: string, q: { propertyId?: string }) {
    return this.scoped(userId, q.propertyId, (ids) => this.occupancyFor(ids));
  }

  async occupancyFor(propertyIds: string[]) {
    const rooms = await this.prisma.room.findMany({ where: { propertyId: { in: propertyIds } }, select: { id: true, roomNumber: true, status: true, defaultRent: true }, orderBy: { roomNumber: 'asc' } });
    const count = (s: string) => rooms.filter((r) => r.status === s).length;
    const occupied = count('OCCUPIED');
    const rentable = rooms.length - count('MAINTENANCE');
    const vacant = rooms.filter((r) => r.status === 'VACANT');
    return {
      totalRooms: rooms.length,
      occupied,
      vacant: vacant.length,
      maintenance: count('MAINTENANCE'),
      occupancyPercent: rooms.length ? Math.round((occupied / rooms.length) * 100) : 0,
      rentableOccupancyPercent: rentable ? Math.round((occupied / rentable) * 100) : 0,
      vacantRooms: vacant.map((r) => ({ id: r.id, roomNumber: r.roomNumber, defaultRent: num(r.defaultRent) })),
      vacantRentPotential: fromPaise(vacant.reduce((s, r) => s + toPaise(num(r.defaultRent)), 0)),
    };
  }
}