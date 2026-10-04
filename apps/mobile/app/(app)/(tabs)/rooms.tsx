import { useRouter } from 'expo-router';
import { Building2, Plus, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, EmptyState, ErrorState, Fab, Input, SkeletonList, Text } from '@/components/ui';
import { useDebounced } from '@/hooks/useDebounced';
import { useListLayout } from '@/hooks/useListLayout';
import { PropertySwitcher } from '@/features/properties/PropertySwitcher';
import { useProperty } from '@/features/properties/PropertyProvider';
import { useRooms } from '@/features/rooms/api';
import { RoomCard } from '@/features/rooms/RoomCard';
import { colors } from '@/theme';
import type { RoomStatus } from '@/types/api';

const FILTERS: { label: string; value?: RoomStatus }[] = [
  { label: 'All' }, { label: 'Occupied', value: 'OCCUPIED' }, { label: 'Vacant', value: 'VACANT' }, { label: 'Maintenance', value: 'MAINTENANCE' },
];

export default function RoomsScreen() {
  const router = useRouter();
  const { listProps, cell } = useListLayout(96);
  const { current, isLoading: loadingProps } = useProperty();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RoomStatus | undefined>();
  const debounced = useDebounced(search.trim());
  const q = useRooms({ propertyId: current?.id, status, search: debounced || undefined });
  const rooms = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const total = q.data?.pages[0]?.total ?? 0;

  const header = (
    <View className="gap-3 pb-3 pt-4">
      <View>
        <Text variant="title">Rooms</Text>
        <PropertySwitcher />
      </View>
      <Input icon={Search} placeholder="Search room or tenant..." value={search} onChangeText={setSearch} returnKeyType="search" autoCorrect={false} />
      <View className="flex-row gap-2">
        {FILTERS.map((f) => <Chip key={f.label} label={f.label} selected={status === f.value} onPress={() => setStatus(f.value)} />)}
      </View>
      {q.data && total > 0 ? <Text variant="secondary" tone="muted">{total} {total === 1 ? 'room' : 'rooms'}</Text> : null}
    </View>
  );

  let body: React.ReactNode = null;
  if (loadingProps || (q.isLoading && !!current)) body = <SkeletonList count={4} lines={4} />;
  else if (!current) body = <EmptyState icon={Building2} title="Add a property first" message="Rooms belong to a property. Create your first property to continue." actionLabel="Add Property" actionIcon={Plus} onAction={() => router.push('/properties/form')} />;
  else if (q.isError) body = <ErrorState error={q.error} onRetry={q.refetch} />;
  else if (rooms.length === 0) {
    body = debounced || status
      ? <EmptyState icon={Search} title="No rooms found" message="Try a different search or filter." />
      : <EmptyState icon={Building2} title="No rooms yet" message="Add your rooms to start assigning tenants and generating bills." actionLabel="Add Room" actionIcon={Plus} onAction={() => router.push('/rooms/form')} />;
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <FlatList
        data={body ? [] : rooms}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        ListEmptyComponent={body}
        {...listProps}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => cell(
          <RoomCard
            room={item}
            onView={() => router.push({ pathname: '/rooms/[id]', params: { id: item.id } })}
            onAssign={() => router.push({ pathname: '/tenants/new', params: { roomId: item.id } } as never)}
          />
        )}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator color={colors.primary.DEFAULT} className="py-4" /> : null}
        refreshControl={<RefreshControl refreshing={q.isRefetching && !q.isFetchingNextPage} onRefresh={q.refetch} tintColor={colors.primary.DEFAULT} />}
      />
      {current ? <Fab icon={Plus} label="Add room" onPress={() => router.push('/rooms/form')} /> : null}
    </SafeAreaView>
  );
}
