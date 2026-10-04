import { Banknote, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Chip, ChipRow, EmptyState, ErrorState, Input, LinkButton, MonthStepper, SkeletonList } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { PropertySwitcher } from '@/components/layout/PropertySwitcher';
import { usePayments } from '@/features/payments/api';
import { METHODS } from '@/features/payments/constants';
import { PaymentRow } from '@/features/payments/PaymentRow';
import { useProperty } from '@/features/properties/PropertyProvider';
import { useDebounced } from '@/hooks/useDebounced';
import { formatINR, formatYM, monthStart, toYM } from '@/utils/format';
import type { PaymentMethod } from '@rental/shared';

export function PaymentsPage() {
  const { current } = useProperty();
  const thisMonth = toYM(monthStart());
  const [month, setMonth] = useState<string | null>(thisMonth); // null = all time
  const [method, setMethod] = useState<PaymentMethod | undefined>();
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search.trim());
  const range = month ? { from: `${month}-01`, to: `${month}-${String(new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate()).padStart(2, '0')}` } : {};
  const q = usePayments({ propertyId: current?.id, method, search: debounced || undefined, ...range }, !!current);
  const payments = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const summary = q.data?.pages[0]?.summary;

  let body: React.ReactNode;
  if (q.isLoading && !!current) body = <SkeletonList count={4} />;
  else if (!current) body = <EmptyState icon={Banknote} title="No property yet" message="Payments appear once you start billing tenants." />;
  else if (q.isError) body = <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  else if (payments.length === 0) body = <EmptyState icon={Banknote} title="No payments found" message={debounced || method || month ? 'Try a different month, method or search.' : 'Recorded payments will appear here.'} action={<LinkButton to="/payments/new" icon={Plus} full={false} className="px-6">Record Payment</LinkButton>} />;
  else body = (
    <>
      <h2 className="mb-3 text-heading">Recent</h2>
      <div className="grid gap-3 md:grid-cols-2">{payments.map((p) => <PaymentRow key={p.id} payment={p} />)}</div>
      {q.hasNextPage ? <div className="mt-4"><Button variant="secondary" onClick={() => void q.fetchNextPage()} loading={q.isFetchingNextPage}>Load more</Button></div> : null}
    </>
  );

  return (
    <Page wide title="Payments" subtitle={<PropertySwitcher />} actions={<LinkButton to="/payments/new" icon={Plus} size="sm" full={false}>Record</LinkButton>}>
      <div className="mb-4 space-y-3">
        <div className="rounded-lg bg-primary p-5 text-white lg:max-w-md">
          <div className="text-small font-medium opacity-80">{month === thisMonth ? 'Collected this month' : month ? `Collected in ${formatYM(month)}` : 'Collected, all time'}</div>
          <div className="mt-1 text-display">{formatINR(summary?.totalAmount ?? 0)}</div>
          <div className="text-small opacity-80">{summary?.count ?? 0} {summary?.count === 1 ? 'payment' : 'payments'}</div>
        </div>
        <div className="flex max-w-md items-center gap-2">
          <div className="flex-1">{month ? <MonthStepper value={month} onChange={setMonth} /> : <div className="flex h-12 items-center rounded-md border border-line-strong bg-surface px-4 font-medium">All time</div>}</div>
          <Button variant="secondary" full={false} className="px-4" onClick={() => setMonth(month ? null : thisMonth)}>{month ? 'All time' : 'By month'}</Button>
        </div>
        <div className="max-w-md"><Input icon={Search} placeholder="Search tenant or reference..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <ChipRow>
          <Chip label="All methods" selected={!method} onClick={() => setMethod(undefined)} />
          {METHODS.map((m) => <Chip key={m.value} label={m.label} selected={method === m.value} onClick={() => setMethod(m.value)} />)}
        </ChipRow>
      </div>
      {body}
    </Page>
  );
}
