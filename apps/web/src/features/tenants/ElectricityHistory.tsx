import { Zap } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, DetailRow, EmptyState, ErrorState, SectionHeader, Segmented, SkeletonList } from '@/components/ui';
import { cn } from '@/utils/cn';
import { formatINR, formatMonth, formatMonthShort } from '@/utils/format';
import { useTenantElectricity } from './api';

/** Month-by-month electricity for one tenant: totals, a 12-month chart and every bill's readings. */
export function ElectricityHistory({ tenantId, currentRate }: { tenantId: string; currentRate?: number | null }) {
  const q = useTenantElectricity(tenantId);
  const [view, setView] = useState<'cost' | 'units'>('cost');
  if (q.isLoading) return <div className="mt-4"><SkeletonList count={2} /></div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const { rows, summary: s } = q.data!;
  if (rows.length === 0) return <div className="mt-4"><EmptyState icon={Zap} title="No electricity charged yet" message="Each month's electricity will be listed here once bills are generated." /></div>;

  // Units are for the owner's own clarity only; they are never added to the bill or its PDF.
  // Months imported from the spreadsheet have no meter readings, so their units are estimated from the amount and the current rate.
  const rate = currentRate ?? s.latestRate;
  const unitsOf = (r: (typeof rows)[number]): { value: number; estimated: boolean } | null =>
    r.units != null ? { value: r.units, estimated: false } : rate ? { value: Math.round((r.amount / rate) * 100) / 100, estimated: true } : null;
  const fmtUnits = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}`;

  const withUnits = rows.flatMap((r) => { const u = unitsOf(r); return u ? [{ month: r.month, ...u }] : []; });
  const totalUnits = withUnits.reduce((sum, u) => sum + u.value, 0);
  const avgUnits = withUnits.length ? totalUnits / withUnits.length : 0;
  const peakUnits = withUnits.reduce<(typeof withUnits)[number] | null>((m, u) => (!m || u.value > m.value ? u : m), null);
  const anyEstimated = withUnits.some((u) => u.estimated);

  const recent = [...rows].slice(0, 12).reverse();
  const valueOf = (r: (typeof rows)[number]) => (view === 'cost' ? r.amount : unitsOf(r)?.value ?? 0);
  const labelOf = (r: (typeof rows)[number]) => (view === 'cost' ? formatINR(r.amount) : `${unitsOf(r)?.estimated ? '≈' : ''}${fmtUnits(unitsOf(r)?.value ?? 0)} units`);
  const max = Math.max(1, ...recent.map(valueOf));
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card className="space-y-0.5"><div className="text-caption text-ink-muted">Total charged</div><div className="text-heading">{formatINR(s.totalAmount)}</div><div className="text-caption text-ink-muted">{s.months} {s.months === 1 ? 'month' : 'months'}</div></Card>
        <Card className="space-y-0.5"><div className="text-caption text-ink-muted">Average a month</div><div className="text-heading">{formatINR(s.averageMonthly)}</div></Card>
        <Card className="space-y-0.5"><div className="text-caption text-ink-muted">Highest month</div><div className="text-heading">{s.highest ? formatINR(s.highest.amount) : '-'}</div><div className="text-caption text-ink-muted">{s.highest ? formatMonth(s.highest.month) : ''}</div></Card>
        <Card className="space-y-0.5"><div className="text-caption text-ink-muted">Total units used</div><div className="text-heading">{withUnits.length ? `${anyEstimated ? '≈' : ''}${fmtUnits(Math.round(totalUnits))} units` : '-'}</div><div className="text-caption text-ink-muted">{withUnits.length} {withUnits.length === 1 ? 'month' : 'months'}</div></Card>
        <Card className="space-y-0.5"><div className="text-caption text-ink-muted">Units a month</div><div className="text-heading">{withUnits.length ? `${anyEstimated ? '≈' : ''}${fmtUnits(Math.round(avgUnits * 10) / 10)} units` : '-'}</div>{peakUnits ? <div className="text-caption text-ink-muted">Most: {fmtUnits(peakUnits.value)} in {formatMonth(peakUnits.month)}</div> : null}</Card>
        <Card className="space-y-0.5"><div className="text-caption text-ink-muted">Current rate</div><div className="text-heading">{rate != null ? `${formatINR(rate)} / unit` : '-'}</div></Card>
      </div>

      <Card className="space-y-3">
        <Segmented options={[{ value: 'cost', label: 'Cost (₹)' }, { value: 'units', label: 'Units' }]} value={view} onChange={setView} />
        <div role="img" aria-label={`Electricity ${view === 'cost' ? 'cost' : 'units'} by month. ${recent.map((r) => `${formatMonthShort(r.month)} ${labelOf(r)}`).join(', ')}`}>
          <div className="flex h-32 items-end justify-between gap-1">
            {recent.map((r) => {
              const est = view === 'units' && unitsOf(r)?.estimated;
              return (
                <div key={r.billId} className="flex h-full flex-1 flex-col items-center justify-end gap-0.5">
                  <span className="text-[9px] leading-none text-ink-muted">{view === 'cost' ? r.amount : fmtUnits(unitsOf(r)?.value ?? 0)}</span>
                  <div className={cn('w-full max-w-5 rounded-t-sm bg-primary', est ? 'opacity-40' : 'opacity-70')} style={{ height: `${Math.max(4, (valueOf(r) / max) * 85)}%` }} title={`${formatMonthShort(r.month)}: ${labelOf(r)}`} />
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-between gap-1">{recent.map((r) => <span key={r.billId} className="flex-1 text-center text-[10px] text-ink-muted">{formatMonthShort(r.month).split(' ')[0]}</span>)}</div>
        </div>
        {view === 'units' && anyEstimated ? <p className="text-caption text-ink-muted">Faded bars and "≈" are estimates: months without a meter reading are worked out as amount ÷ {formatINR(rate)} per unit.</p> : null}
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
            <div className="text-right">
              <div className="text-heading">{formatINR(r.amount)}</div>
              {unitsOf(r) ? <div className="text-small text-ink-soft">{unitsOf(r)!.estimated ? '≈ ' : ''}{fmtUnits(unitsOf(r)!.value)} units</div> : null}
            </div>
          </Link>
        ))}
      </Card>
      <DetailRow label="Months with a meter reading" value={String(rows.filter((r) => r.currentReading != null).length)} last />
    </div>
  );
}