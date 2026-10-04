import { useRouter } from 'expo-router';
import { Plus, Receipt, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, EmptyState, ErrorState, Fab, Input, SkeletonList, Text } from '@/components/ui';
import { useBills } from '@/features/bills/api';
import { BillCard } from '@/features/bills/BillCard';
import { useProperty } from '@/features/properties/PropertyProvider';
import { PropertySwitcher } from '@/features/properties/PropertySwitcher';
import { useDebounced } from '@/hooks/useDebounced';
import { useListLayout } from '@/hooks/useListLayout';
import { colors } from '@/theme';
import type { BillStatus } from '@/types/api';

const FILTERS: { label: string; value?: BillStatus }[] = [
  { label: 'All' }, { label: 'Unpaid', value: 'GENERATED' }, { label: 'Partial', value: 'PARTIALLY_PAID' }, { label: 'Overdue', value: 'OVERDUE' }, { label: 'Paid', value: 'PAID' }, { label: 'Cancelled', value: 'CANCELLED' },
];

export default function BillsScreen() {
  const router = useRouter();
  const { listProps, cell } = useListLayout(96);
  const { current, isLoading: loadingProps } = useProperty();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<BillStatus | undefined>();
  const debounced = useDebounced(search.trim());
  const q = useBills({ propertyId: current?.id, status, search: debounced || undefined }, !!current);
  const bills = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);

  const header = (
    <View className="gap-3 pb-3 pt-4">
      <View>
        <Text variant="title">Bills</Text>
        <PropertySwitcher />
      </View>
      <Input icon={Search} placeholder="Search tenant, room or bill no..." value={search} onChangeText={setSearch} returnKeyType="search" autoCorrect={false} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2" className="flex-grow-0">
        {FILTERS.map((f) => <Chip key={f.label} label={f.label} selected={status === f.value} onPress={() => setStatus(f.value)} />)}
      </ScrollView>
    </View>
  );

  let body: React.ReactNode = null;
  if (loadingProps || (q.isLoading && !!current)) body = <SkeletonList count={4} lines={3} />;
  else if (!current) body = <EmptyState icon={Receipt} title="Add a property first" message="Bills are created for tenants of a property." actionLabel="Add Property" actionIcon={Plus} onAction={() => router.push('/properties/form')} />;
  else if (q.isError) body = <ErrorState error={q.error} onRetry={q.refetch} />;
  else if (bills.length === 0) {
    body = debounced || status
      ? <EmptyState icon={Search} title="No bills found" message="Try a different search or filter." />
      : <EmptyState icon={Receipt} title="No bills yet" message="Generate the first monthly bill for one of your tenants." actionLabel="Generate Bill" actionIcon={Plus} onAction={() => router.push('/bills/new')} />;
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <FlatList
        data={body ? [] : bills}
        keyExtractor={(b) => b.id}
        ListHeaderComponent={header}
        ListEmptyComponent={body}
        {...listProps}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => cell(<BillCard bill={item} onPress={() => router.push({ pathname: '/bills/[id]', params: { id: item.id } })} />)}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator color={colors.primary.DEFAULT} className="py-4" /> : null}
        refreshControl={<RefreshControl refreshing={q.isRefetching && !q.isFetchingNextPage} onRefresh={q.refetch} tintColor={colors.primary.DEFAULT} />}
      />
      {current ? <Fab icon={Plus} label="Generate bill" onPress={() => router.push('/bills/new')} /> : null}
    </SafeAreaView>
  );
}
