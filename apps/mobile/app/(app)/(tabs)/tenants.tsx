import { useRouter } from 'expo-router';
import { Plus, Search, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, EmptyState, ErrorState, Fab, Input, SkeletonList, Text } from '@/components/ui';
import { useDebounced } from '@/hooks/useDebounced';
import { useListLayout } from '@/hooks/useListLayout';
import { useProperty } from '@/features/properties/PropertyProvider';
import { PropertySwitcher } from '@/features/properties/PropertySwitcher';
import { useTenants } from '@/features/tenants/api';
import { TenantCard } from '@/features/tenants/TenantCard';
import { colors } from '@/theme';
import type { TenantStatus } from '@/types/api';

const FILTERS: { label: string; status?: TenantStatus; dues?: 'true' }[] = [
  { label: 'All' }, { label: 'Active', status: 'ACTIVE' }, { label: 'Moved out', status: 'MOVED_OUT' }, { label: 'Owes money', dues: 'true' }, { label: 'Left with dues', status: 'MOVED_OUT', dues: 'true' },
];

export default function TenantsScreen() {
  const router = useRouter();
  const { listProps, cell } = useListLayout(96);
  const { current, isLoading: loadingProps } = useProperty();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(FILTERS[0]);
  const status = filter.status;
  const debounced = useDebounced(search.trim());
  const q = useTenants({ propertyId: current?.id, status, dues: filter.dues, search: debounced || undefined });
  const tenants = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const total = q.data?.pages[0]?.total ?? 0;

  const header = (
    <View className="gap-3 pb-3 pt-4">
      <View>
        <Text variant="title">Tenants</Text>
        <PropertySwitcher />
      </View>
      <Input icon={Search} placeholder="Search name, phone or room..." value={search} onChangeText={setSearch} returnKeyType="search" autoCorrect={false} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2" className="flex-grow-0">
        {FILTERS.map((f) => <Chip key={f.label} label={f.label} selected={filter === f} onPress={() => setFilter(f)} />)}
      </ScrollView>
      {q.data && total > 0 ? <Text variant="secondary" tone="muted">{total} {total === 1 ? 'tenant' : 'tenants'}</Text> : null}
    </View>
  );

  let body: React.ReactNode = null;
  if (loadingProps || (q.isLoading && !!current)) body = <SkeletonList count={4} lines={3} />;
  else if (!current) body = <EmptyState icon={Users} title="Add a property first" message="Tenants belong to a property. Create your first property to continue." actionLabel="Add Property" actionIcon={Plus} onAction={() => router.push('/properties/form')} />;
  else if (q.isError) body = <ErrorState error={q.error} onRetry={q.refetch} />;
  else if (tenants.length === 0) {
    body = debounced || filter !== FILTERS[0]
      ? <EmptyState icon={Search} title="No tenants found" message="Try a different search or filter." />
      : <EmptyState icon={Users} title="No tenants yet" message="Add your first tenant to start managing rent and bills." actionLabel="Add Tenant" actionIcon={Plus} onAction={() => router.push('/tenants/new')} />;
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <FlatList
        data={body ? [] : tenants}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={header}
        ListEmptyComponent={body}
        {...listProps}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => cell(<TenantCard tenant={item} onPress={() => router.push({ pathname: '/tenants/[id]', params: { id: item.id } })} />)}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator color={colors.primary.DEFAULT} className="py-4" /> : null}
        refreshControl={<RefreshControl refreshing={q.isRefetching && !q.isFetchingNextPage} onRefresh={q.refetch} tintColor={colors.primary.DEFAULT} />}
      />
      {current ? <Fab icon={Plus} label="Add tenant" onPress={() => router.push('/tenants/new')} /> : null}
    </SafeAreaView>
  );
}
