import { useRouter } from 'expo-router';
import { Building2, ChevronRight, CircleCheck, DoorClosed, DoorOpen, Plus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Card, EmptyState, ErrorState, Icon, ProgressBar, Screen, SectionHeader, SkeletonList, StatCard, Text } from '@/components/ui';
import { ownerName, useDashboard } from '@/features/dashboard';
import { QuickActions } from '@/features/home/QuickActions';
import { PropertySwitcher } from '@/features/properties/PropertySwitcher';
import { useProperty } from '@/features/properties/PropertyProvider';
import { formatINR, greeting } from '@/utils/format';

export default function HomeScreen() {
  const router = useRouter();
  const { current, isLoading: loadingProps, isError: propsError, error: propsErr, refetch: refetchProps } = useProperty();
  const q = useDashboard(current?.id);
  const d = q.data;
  const loading = loadingProps || (!!current && q.isLoading);

  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => { refetchProps(); q.refetch(); }}>
      <View className="pb-3 pt-4">
        <Text variant="title">{greeting()}, {ownerName(d?.username)}</Text>
        <PropertySwitcher />
      </View>

      {loading ? (
        <View className="mt-2"><SkeletonList count={3} lines={3} /></View>
      ) : propsError || q.isError ? (
        <ErrorState error={propsErr ?? q.error} onRetry={() => { refetchProps(); q.refetch(); }} />
      ) : !current ? (
        <EmptyState icon={Building2} title="Add your first property" message="Create a property to start adding rooms, tenants and bills." actionLabel="Add Property" actionIcon={Plus} onAction={() => router.push('/properties/form')} />
      ) : d?.collection && d.occupancy ? (
        <>
          <Pressable onPress={() => router.push('/reports')} accessibilityRole="button" className="rounded-xl bg-primary p-5 active:bg-primary-dark">
            <Text variant="secondaryMedium" tone="white" className="opacity-80">Collection · {d.collection.monthLabel}</Text>
            <Text variant="display" tone="white" className="mt-1" style={{ fontSize: 34, lineHeight: 40 }}>{formatINR(d.collection.collected)}</Text>
            <Text variant="secondary" tone="white" className="mb-4 opacity-80">of {formatINR(d.collection.expected)} expected</Text>
            <ProgressBar value={d.collection.collectionRate} />
            {d.collection.pending > 0 ? (
              <Text variant="secondaryMedium" tone="white" className="mt-3">{formatINR(d.collection.pending)} pending from tenants</Text>
            ) : (
              <View className="mt-3 flex-row items-center gap-1.5"><Icon icon={CircleCheck} size="sm" tone="white" /><Text variant="secondaryMedium" tone="white">Nothing pending</Text></View>
            )}
          </Pressable>

          <SectionHeader title="Rooms" actionLabel="View all" onAction={() => router.push('/rooms')} />
          <View className="flex-row gap-3">
            <StatCard value={String(d.occupancy.occupied)} label="Occupied" icon={DoorClosed} onPress={() => router.push('/rooms')} />
            <StatCard value={String(d.occupancy.vacant)} label="Vacant" icon={DoorOpen} tone="warning" onPress={() => router.push('/rooms')} />
          </View>
          {d.occupancy.maintenance > 0 ? <Text variant="secondary" tone="muted" className="mt-2">{d.occupancy.maintenance} under maintenance · {d.occupancy.occupancyPercent}% occupancy</Text> : d.occupancy.totalRooms > 0 ? <Text variant="secondary" tone="muted" className="mt-2">{d.occupancy.occupancyPercent}% occupancy</Text> : null}

          <SectionHeader title="Pending Payments" actionLabel={d.pendingPayments.length ? 'See all' : undefined} onAction={() => router.push({ pathname: '/reports', params: { tab: 'outstanding' } })} />
          {d.pendingPayments.length === 0 ? (
            <Card className="flex-row items-center gap-3"><Icon icon={CircleCheck} tone="success" /><Text tone="soft" className="flex-1">No pending payments. Everyone is paid up.</Text></Card>
          ) : (
            <Card padded={false}>
              {d.pendingPayments.map((p, i) => (
                <Pressable key={p.tenantId} onPress={() => router.push({ pathname: '/tenants/[id]', params: { id: p.tenantId } })} accessibilityRole="button" className={`min-h-16 flex-row items-center px-4 py-3 active:bg-surface-muted ${i < d.pendingPayments.length - 1 ? 'border-b border-line' : ''}`}>
                  <View className="flex-1">
                    <Text variant="bodyMedium">{p.fullName}</Text>
                    <Text variant="secondary" tone="soft">Room {p.roomNumber}{p.overdueDays > 0 ? ` · ${p.overdueDays} ${p.overdueDays === 1 ? 'day' : 'days'} overdue` : ''}</Text>
                  </View>
                  <Text variant="heading" tone="danger" className="mr-1">{formatINR(p.balance)}</Text>
                  <Icon icon={ChevronRight} tone="muted" size="sm" />
                </Pressable>
              ))}
            </Card>
          )}

          <SectionHeader title="Quick Actions" />
          <QuickActions />
        </>
      ) : null}
    </Screen>
  );
}
