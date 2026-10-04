import { Link } from 'react-router-dom';
import { Badge, Card } from '@/components/ui';
import { formatINR, formatMonth } from '@/utils/format';
import type { BillListItem, BillStatus } from '@rental/shared';
import { BILL_STATUS } from './status';

export function BillStatusBadge({ status }: { status: BillStatus }) {
  const s = BILL_STATUS[status];
  return <Badge label={s.label} tone={s.tone} />;
}

export function BillCard({ bill, showTenant = true }: { bill: BillListItem; showTenant?: boolean }) {
  const cancelled = bill.status === 'CANCELLED';
  const carried = !!bill.carriedForwardToId;
  return (
    <Card padded={false}>
      <Link to={`/bills/${bill.id}`} className="block space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-heading">{formatMonth(bill.billingPeriod)}</div>
            {showTenant ? <div className="truncate text-small text-ink-soft">{bill.tenant.fullName} · Room {bill.room.roomNumber}</div> : <div className="text-small text-ink-muted">{bill.billNumber}</div>}
          </div>
          <BillStatusBadge status={bill.status} />
        </div>
        <div className="flex items-end justify-between">
          <span className={`text-[20px] font-semibold ${cancelled ? 'text-ink-muted line-through' : ''}`}>{formatINR(bill.totalDue)}</span>
          {cancelled ? null : carried ? <span className="text-small text-ink-muted">Carried forward</span>
            : bill.status === 'PAID' ? <span className="text-small font-medium text-success">Paid in full</span>
            : <div className="text-right">{bill.paidAmount > 0 ? <div className="text-caption text-ink-muted">{formatINR(bill.paidAmount)} paid</div> : null}<div className="font-semibold text-danger">{formatINR(bill.balance)} pending</div></div>}
        </div>
      </Link>
    </Card>
  );
}
