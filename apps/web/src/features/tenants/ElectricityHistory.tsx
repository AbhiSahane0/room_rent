import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, DetailRow, EmptyState, ErrorState, SectionHeader, SkeletonList } from '@/components/ui';
import { cn } from '@/utils/cn';
import { formatINR, formatMonth, formatMonthShort } from '@/utils/format';
import { useTenantElectricity } from './api';

/** Month-by-month electricity for one tenant: totals, a 12-month chart and every bill's readings. */
export function ElectricityHistory({ tenantId }: { tenantId: string }) {
  const q = useTenantElectricity(tenantId);
  if (q.isLoading) return <div className="mt-4"><SkeletonList count={2} /></div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const { rows, summary: s } = q.data!;
  if (rows.length === 0) return <div className="mt-4"><EmptyState icon={Zap} title="No electricity charged yet" message="Each month's electricity will be listed here once bills are generated." /></div>;

  const recent = [...rows].slice(0, 12).reverse();
  const max = Math.max(1, ...recent.map((r) => r.amount));
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="space-y-0.5"><div className="text-caption text-ink-muted">Total charged</div><div className="text-heading">{formatINR(s.totalAmount)}</div><div className="text-caption text-ink-muted">{s.months} {s.months === 1 ? 'month' : 'months'}</div></Card>
        <Card className="space-y-0.5"><div className="text-caption text-ink-muted">Average a month</div><div className="text-heading">{formatINR(s.averageMonthly)}</div></Card>
        <Card className="space-y-0.5"><div className="text-caption text-ink-muted">Highest month</div><div className="text-heading">{s.highest ? formatINR(s.highest.amount) : '-'}</div><div className="text-caption text-ink-muted">{s.highest ? formatMonth(s.highest.month) : ''}</div></Card>
        <Card className="space-y-0.5"><div className="text-caption text-ink-muted">Current rate</div><div className="text-heading">{s.latestRate != null ? `${formatINR(s.latestRate)} / unit` : '-'}</div>{s.totalUnits != null ? <div className="text-caption text-ink-muted">{s.totalUnits} units metered</div> : null}</Card>
      </div>

      <Card>
        <div role="img" aria-label={`Electricity by month. ${recent.map((r) => `${formatMonthShort(r.month)} ${formatINR(r.amount)}`).join(', ')}`}>
          <div className="flex h-28 items-end justify-between gap-1">
            {recent.map((r) => <div key={r.billId} className="flex flex-1 items-end justify-center" style={{ height: '100%' }}><div className="w-full max-w-5 rounded-t-sm bg-primary/70" style={{ height: `${Math.max(4, (r.amount / max) * 100)}%` }} title={`${formatMonthShort(r.month)}: ${formatINR(r.amount)}`} /></div>)}
          </div>
          <div className="mt-1.5 flex justify-between gap-1">{recent.map((r) => <span key={r.billId} className="flex-1 text-center text-[10px] text-ink-muted">{formatMonthShort(r.month).split(' ')[0]}</span>)}</div>
        </div>
      </Card>

      <SectionHeader title="Every month" />
      <Card padded={false} className="overflow-hidden">
        {rows.map((r, i) => (
          <Link key={r.billId} to={`/bills/${r.billId}`} className={cn('flex items-center gap-3 px-4 py-3 hover:bg-surface-muted', i < rows.length - 1 && 'border-b border-line')}>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{formatMonth(r.month)}</div>
              <div className="truncate text-small text-ink-soft">
                {r.currentReading != null ? `Meter ${r.previousReading} to ${r.currentReading} · ${r.units} units × ${formatINR(r.ratePerUnit)}` : r.adjusted ? 'Amount recorded without meter readings' : 'Amount'}
                {r.roomNumber ? ` · Room ${r.roomNumber}` : ''}
              </div>
            </div>
            <span className="text-heading">{formatINR(r.amount)}</span>
          </Link>
        ))}
      </Card>
      <DetailRow label="Months with a meter reading" value={String(rows.filter((r) => r.currentReading != null).length)} last />
    </div>
  );
}
