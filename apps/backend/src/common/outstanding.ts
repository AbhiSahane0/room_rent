import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

/** Bills that count toward what a tenant owes. Carried-forward bills are already included in a later bill. */
export const OUTSTANDING_BILL_WHERE: Prisma.BillWhereInput = {
  status: { notIn: ['CANCELLED', 'DRAFT'] },
  carriedForwardToId: null,
};

/** Outstanding balance per tenant (total_due - paid_amount of open, non carried-forward bills). */
export async function outstandingByTenant(prisma: PrismaService, tenantIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!tenantIds.length) return out;
  const bills = await prisma.bill.findMany({
    where: { tenantId: { in: tenantIds }, ...OUTSTANDING_BILL_WHERE },
    select: { tenantId: true, totalDue: true, paidAmount: true },
  });
  for (const b of bills) {
    const cur = out.get(b.tenantId) ?? 0;
    out.set(b.tenantId, Math.round((cur + b.totalDue.toNumber() - b.paidAmount.toNumber()) * 100) / 100);
  }
  return out;
}
