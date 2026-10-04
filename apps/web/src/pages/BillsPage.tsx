import { Plus, Receipt, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Chip, ChipRow, EmptyState, ErrorState, Input, LinkButton, SkeletonList } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { PropertySwitcher } from '@/components/layout/PropertySwitcher';
import { useBills } from '@/features/bills/api';
import { BillCard } from '@/features/bills/BillCard';
import { useProperty } from '@/features/properties/PropertyProvider';
import { useDebounced } from '@/hooks/useDebounced';
import type { BillStatus } from '@rental/shared';

const FILTERS: { label: string; value?: BillStatus }[] = [
  { label: 'All' }, { label: 'Unpaid', value: 'GENERATED' }, { label: 'Partial', value: 'PARTIALLY_PAID' }, { label: 'Overdue', value: 'OVERDUE' }, { label: 'Paid', value: 'PAID' }, { label: 'Cancelled', value: 'CANCELLED' },
];

export function BillsPage() {
  const { current, isLoading: loadingProps } = useProperty();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<BillStatus | undefined>();
  const debounced = useDebounced(search.trim());
  const q = useBills({ propertyId: current?.id, status, search: debounced || undefined }, !!current);
  const bills = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);

  let body: React.ReactNode;
  if (loadingProps || (q.isLoading && !!current)) body = <SkeletonList count={4} />;
  else if (!current) body = <EmptyState icon={Receipt} title="Add a property first" message="Bills are created for tenants of a property." action={<LinkButton to="/properties/new" icon={Plus} full={false} className="px-6">Add Property</LinkButton>} />;
  else if (q.isError) body = <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  else if (bills.length === 0) body = debounced || status ? <EmptyState icon={Search} title="No bills found" message="Try a different search or filter." /> : <EmptyState icon={Receipt} title="No bills yet" message="Generate the first monthly bill for one of your tenants." action={<LinkButton to="/bills/new" icon={Plus} full={false} className="px-6">Generate Bill</LinkButton>} />;
  else body = (
    <>
      <div className="grid gap-3 md:grid-cols-2">{bills.map((b) => <BillCard key={b.id} bill={b} />)}</div>
      {q.hasNextPage ? <div className="mt-4"><Button variant="secondary" onClick={() => void q.fetchNextPage()} loading={q.isFetchingNextPage}>Load more</Button></div> : null}
    </>
  );

  return (
    <Page wide title="Bills" subtitle={<PropertySwitcher />} actions={current ? <LinkButton to="/bills/new" icon={Plus} size="sm" full={false}>Generate Bill</LinkButton> : undefined}>
      <div className="mb-4 space-y-3">
        <div className="max-w-md"><Input icon={Search} placeholder="Search tenant, room or bill no..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <ChipRow>{FILTERS.map((f) => <Chip key={f.label} label={f.label} selected={status === f.value} onClick={() => setStatus(f.value)} />)}</ChipRow>
      </div>
      {body}
    </Page>
  );
}
