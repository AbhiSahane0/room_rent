import { Building2, ChevronRight, Plus, Search, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Chip, ChipRow, EmptyState, ErrorState, Icon, Input, LinkButton, SkeletonList, Spinner } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { PropertySwitcher } from '@/components/layout/PropertySwitcher';
import { useDebounced } from '@/hooks/useDebounced';
import { useProperty } from '@/features/properties/PropertyProvider';
import { useRooms } from '@/features/rooms/api';
import { ROOM_STATUS } from '@/features/rooms/status';
import { formatINR } from '@/utils/format';
import type { Room, RoomStatus } from '@rental/shared';

const FILTERS: { label: string; value?: RoomStatus }[] = [{ label: 'All' }, { label: 'Occupied', value: 'OCCUPIED' }, { label: 'Vacant', value: 'VACANT' }, { label: 'Maintenance', value: 'MAINTENANCE' }];

function RoomCard({ room }: { room: Room }) {
  const status = ROOM_STATUS[room.status];
  return (
    <Card className="flex h-full flex-col gap-3">
      <Link to={`/rooms/${room.id}`} className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between"><span className="text-heading">Room {room.roomNumber}</span><Badge label={status.label} tone={status.tone} /></div>
        {room.currentTenant ? <div className="font-medium">{room.currentTenant.fullName}</div> : null}
        <div className="mt-auto flex items-end justify-between">
          <div><span className="text-[20px] font-semibold">{formatINR(room.monthlyRent)}</span><span className="text-small text-ink-soft"> / month</span></div>
          {room.currentTenant ? <div className="text-right"><div className="text-caption text-ink-muted">Balance</div><div className={`text-heading ${room.balance > 0 ? 'text-danger' : 'text-success'}`}>{room.balance > 0 ? formatINR(room.balance) : 'Paid'}</div></div> : null}
        </div>
      </Link>
      {room.status === 'VACANT' ? <LinkButton to={`/tenants/new?roomId=${room.id}`} icon={UserPlus} variant="secondary" size="sm">Assign Tenant</LinkButton>
        : <Link to={`/rooms/${room.id}`} className="flex items-center justify-end gap-1 text-small font-medium text-primary">View<Icon icon={ChevronRight} size={16} tone="primary" /></Link>}
    </Card>
  );
}

export function RoomsPage() {
  const { current, isLoading: loadingProps } = useProperty();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RoomStatus | undefined>();
  const debounced = useDebounced(search.trim());
  const q = useRooms({ propertyId: current?.id, status, search: debounced || undefined });
  const rooms = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const total = q.data?.pages[0]?.total ?? 0;

  let body: React.ReactNode;
  if (loadingProps || (q.isLoading && !!current)) body = <SkeletonList count={4} />;
  else if (!current) body = <EmptyState icon={Building2} title="Add a property first" message="Rooms belong to a property. Create your first property to continue." action={<LinkButton to="/properties/new" icon={Plus} full={false} className="px-6">Add Property</LinkButton>} />;
  else if (q.isError) body = <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  else if (rooms.length === 0) body = debounced || status ? <EmptyState icon={Search} title="No rooms found" message="Try a different search or filter." /> : <EmptyState icon={Building2} title="No rooms yet" message="Add your rooms to start assigning tenants and generating bills." action={<LinkButton to="/rooms/new" icon={Plus} full={false} className="px-6">Add Room</LinkButton>} />;
  else body = (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rooms.map((r) => <RoomCard key={r.id} room={r} />)}</div>
      {q.hasNextPage ? <div className="mt-4"><Button variant="secondary" onClick={() => void q.fetchNextPage()} loading={q.isFetchingNextPage}>Load more</Button></div> : null}
    </>
  );

  return (
    <Page wide title="Rooms" subtitle={<PropertySwitcher />} actions={current ? <LinkButton to="/rooms/new" icon={Plus} size="sm" full={false}>Add Room</LinkButton> : undefined}>
      <div className="mb-4 space-y-3">
        <div className="max-w-md"><Input icon={Search} placeholder="Search room or tenant..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <ChipRow>{FILTERS.map((f) => <Chip key={f.label} label={f.label} selected={status === f.value} onClick={() => setStatus(f.value)} />)}</ChipRow>
        {q.data && total > 0 ? <p className="text-small text-ink-muted">{total} {total === 1 ? 'room' : 'rooms'}</p> : null}
      </div>
      {body}
      {q.isFetching && !q.isLoading && !q.isFetchingNextPage ? <div className="mt-2 flex justify-center text-ink-muted"><Spinner /></div> : null}
    </Page>
  );
}
