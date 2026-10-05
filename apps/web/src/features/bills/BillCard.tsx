import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { friendlyError } from '@/api/client';
import { Badge, Card, ConfirmDialog, Icon, Notice } from '@/components/ui';
import { formatINR, formatMonth } from '@/utils/format';
import type { BillListItem, BillStatus } from '@rental/shared';
import { useDeleteBill } from './api';
import { BILL_STATUS } from './status';

export function BillStatusBadge({ status }: { status: BillStatus }) {
  const s = BILL_STATUS[status];
  return <Badge label={s.label} tone={s.tone} />;
}

export function BillCard({ bill, showTenant = true }: { bill: BillListItem; showTenant?: boolean }) {
  const cancelled = bill.status === 'CANCELLED';
  const carried = !!bill.carriedForwardToId;
  const canDelete = cancelled && bill.paidAmount === 0;
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const del = useDeleteBill(bill.id);
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
      {canDelete ? (
        <div className="space-y-2 border-t border-line px-4 py-2">
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <button type="button" onClick={() => { setError(null); setDeleting(true); }} className="inline-flex h-10 items-center gap-2 text-small font-semibold text-danger"><Icon icon={Trash2} tone="danger" size={18} />Delete bill</button>
        </div>
      ) : null}
      {canDelete ? (
        <ConfirmDialog open={deleting} title="Delete this cancelled bill?" confirmLabel="Delete bill" destructive loading={del.isPending}
          message={`${formatMonth(bill.billingPeriod)} bill (${bill.billNumber}) is removed for good and will no longer appear in your bills or exports. This cannot be undone.`}
          onConfirm={async () => { try { await del.mutateAsync(); setDeleting(false); } catch (e) { setDeleting(false); setError(friendlyError(e)); } }}
          onCancel={() => setDeleting(false)} />
      ) : null}
    </Card>
  );
}