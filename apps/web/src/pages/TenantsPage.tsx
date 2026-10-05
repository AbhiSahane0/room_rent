import { Plus, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Chip, ChipRow, EmptyState, ErrorState, Input, LinkButton, SkeletonList } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { PropertySwitcher } from '@/components/layout/PropertySwitcher';
import { useDebounced } from '@/hooks/useDebounced';
import { useProperty } from '@/features/properties/PropertyProvider';
import { useTenants } from '@/features/tenants/api';
import { TenantCard } from '@/features/tenants/TenantCard';
import { ExportButton } from '@/features/exports/ExportButton';
import type { TenantStatus } from '@rental/shared';

const FILTERS: { label: string; status?: TenantStatus; dues?: 'true' }[] = [
  { label: 'All' }, { label: 'Active', status: 'ACTIVE' }, { label: 'Moved out', status: 'MOVED_OUT' }, { label: 'Owes money', dues: 'true' }, { label: 'Left with dues', status: 'MOVED_OUT', dues: 'true' },
];

export function TenantsPage() {
  const { current, isLoading: loadingProps } = useProperty();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(FILTERS[0]);
  const status = filter.status;
  const debounced = useDebounced(search.trim());
  const q = useTenants({ propertyId: current?.id, status, dues: filter.dues, search: debounced || undefined });
  const tenants = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const total = q.data?.pages[0]?.total ?? 0;

  let body: React.ReactNode;
  if (loadingProps || (q.isLoading && !!current)) body = <SkeletonList count={4} />;
  else if (!current) body = <EmptyState icon={Users} title="Add a property first" message="Tenants belong to a property. Create your first property to continue." action={<LinkButton to="/properties/new" icon={Plus} full={false} className="px-6">Add Property</LinkButton>} />;
  else if (q.isError) body = <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  else if (tenants.length === 0) body = debounced || filter !== FILTERS[0] ? <EmptyState icon={Search} title="No tenants found" message="Try a different search or filter." /> : <EmptyState icon={Users} title="No tenants yet" message="Add your first tenant to start managing rent and bills." action={<LinkButton to="/tenants/new" icon={Plus} full={false} className="px-6">Add Tenant</LinkButton>} />;
  else body = (
    <>
      <div className="grid gap-3 md:grid-cols-2">{tenants.map((t) => <TenantCard key={t.id} tenant={t} />)}</div>
      {q.hasNextPage ? <div className="mt-4"><Button variant="secondary" onClick={() => void q.fetchNextPage()} loading={q.isFetchingNextPage}>Load more</Button></div> : null}
    </>
  );

  return (
    <Page wide title="Tenants" subtitle={<PropertySwitcher />} actions={current ? <div className="flex items-center gap-2"><ExportButton propertyId={current.id} variant="secondary" /><LinkButton to="/tenants/new" icon={Plus} size="sm" full={false}>Add Tenant</LinkButton></div> : undefined}>
      <div className="mb-4 space-y-3">
        <div className="max-w-md"><Input icon={Search} placeholder="Search name, phone or room..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <ChipRow>{FILTERS.map((f) => <Chip key={f.label} label={f.label} selected={filter === f} onClick={() => setFilter(f)} />)}</ChipRow>
        {q.data && total > 0 ? <p className="text-small text-ink-muted">{total} {total === 1 ? 'tenant' : 'tenants'}</p> : null}
      </div>
      {body}
    </Page>
  );
}
