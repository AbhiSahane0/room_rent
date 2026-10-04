import { Building2, ChevronRight, CircleCheck, DoorClosed, DoorOpen, Banknote, Plus, Receipt, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, EmptyState, ErrorState, Icon, LinkButton, ProgressBar, SectionHeader, SkeletonList, StatCard } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { PropertySwitcher } from '@/components/layout/PropertySwitcher';
import { ownerName, useDashboard } from '@/features/dashboard';
import { useProperty } from '@/features/properties/PropertyProvider';
import { formatINR, greeting } from '@/utils/format';

const QUICK = [
  { to: '/tenants/new', label: 'Add Tenant', icon: UserPlus },
  { to: '/bills/new', label: 'Generate Bill', icon: Receipt },
  { to: '/payments/new', label: 'Record Payment', icon: Banknote },
  { to: '/rooms/new', label: 'Add Room', icon: DoorOpen },
];

export function HomePage() {
  const { current, rememberedId, isLoading: loadingProps, isError: propsError, error: propsErr, refetch } = useProperty();
  // Starts straight away with the remembered property (the API falls back to the first one if it is gone), instead of waiting for the property list.
  const q = useDashboard(current?.id ?? rememberedId ?? undefined);
  const d = q.data;
  const loading = (loadingProps && !q.data) || ((!!current || !!rememberedId) && q.isLoading);

  const collection = d?.collection && (
    <Link to="/reports" className="block rounded-xl bg-primary p-5 text-white transition-colors hover:bg-primary-dark">
      <div className="text-small font-medium opacity-80">Collection · {d.collection.monthLabel}</div>
      <div className="mt-1 text-[34px] font-bold leading-[40px]">{formatINR(d.collection.collected)}</div>
      <div className="mb-4 text-small opacity-80">of {formatINR(d.collection.expected)} expected</div>
      <ProgressBar value={d.collection.collectionRate} />
      {d.collection.pending > 0 ? <div className="mt-3 text-small font-medium">{formatINR(d.collection.pending)} pending from tenants</div> : <div className="mt-3 flex items-center gap-1.5 text-small font-medium"><Icon icon={CircleCheck} size={16} tone="white" />Nothing pending</div>}
    </Link>
  );
  const rooms = d?.occupancy && (
    <>
      <SectionHeader title="Rooms" action={<Link to="/rooms" className="text-small font-medium text-primary">View all</Link>} />
      <div className="flex gap-3">
        <StatCard value={String(d.occupancy.occupied)} label="Occupied" icon={DoorClosed} to="/rooms" />
        <StatCard value={String(d.occupancy.vacant)} label="Vacant" icon={DoorOpen} to="/rooms" />
      </div>
      <p className="mt-2 text-small text-ink-muted">{d.occupancy.maintenance > 0 ? `${d.occupancy.maintenance} under maintenance · ` : ''}{d.occupancy.occupancyPercent}% occupancy</p>
    </>
  );
  const pending = d && (
    <>
      <SectionHeader title="Pending Payments" action={d.pendingPayments.length ? <Link to="/reports?tab=outstanding" className="text-small font-medium text-primary">See all</Link> : undefined} />
      {d.pendingPayments.length === 0 ? (
        <Card className="flex items-center gap-3"><Icon icon={CircleCheck} tone="success" /><span className="text-ink-soft">No pending payments. Everyone is paid up.</span></Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          {d.pendingPayments.map((p, i) => (
            <Link key={p.tenantId} to={`/tenants/${p.tenantId}`} className={`flex min-h-16 items-center px-4 py-3 hover:bg-surface-muted ${i < d.pendingPayments.length - 1 ? 'border-b border-line' : ''}`}>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{p.fullName}</div>
                <div className="text-small text-ink-soft">Room {p.roomNumber}{p.overdueDays > 0 ? ` · ${p.overdueDays} ${p.overdueDays === 1 ? 'day' : 'days'} overdue` : ''}</div>
              </div>
              <span className="mr-1 text-heading text-danger">{formatINR(p.balance)}</span><Icon icon={ChevronRight} size={16} tone="muted" />
            </Link>
          ))}
        </Card>
      )}
    </>
  );
  const quick = (
    <>
      <SectionHeader title="Quick Actions" />
      <div className="grid grid-cols-4 gap-3">
        {QUICK.map((a) => (
          <Link key={a.to} to={a.to} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-line bg-surface p-3 text-center text-small font-medium hover:bg-surface-muted">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft"><Icon icon={a.icon} size={24} tone="primary" /></span>{a.label}
          </Link>
        ))}
      </div>
    </>
  );

  return (
    <Page wide>
      <div className="pb-3"><h1 className="text-title">{greeting()}, {ownerName(d?.username)}</h1><PropertySwitcher /></div>
      {loading ? <SkeletonList count={3} /> : propsError || q.isError ? <ErrorState error={propsErr ?? q.error} onRetry={() => { refetch(); void q.refetch(); }} />
        : !current && !loadingProps ? <EmptyState icon={Building2} title="Add your first property" message="Create a property to start adding rooms, tenants and bills." action={<LinkButton to="/properties/new" icon={Plus} full={false} className="px-6">Add Property</LinkButton>} />
        : d?.collection && d.occupancy ? (
          <div className="grid items-start gap-x-6 md:grid-cols-2">
            <div>{collection}{rooms}</div>
            <div>{pending}{quick}</div>
          </div>
        ) : null}
    </Page>
  );
}
