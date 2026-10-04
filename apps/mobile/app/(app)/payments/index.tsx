import { useRouter } from 'expo-router';
import { Banknote, Plus, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, EmptyState, ErrorState, Header, Input, MonthStepper, SkeletonList, Text } from '@/components/ui';
import { usePayments } from '@/features/payments/api';
import { PaymentRow } from '@/features/payments/PaymentRow';
import { METHODS } from '@/features/payments/constants';
import { PropertySwitcher } from '@/features/properties/PropertySwitcher';
import { useProperty } from '@/features/properties/PropertyProvider';
import { useDebounced } from '@/hooks/useDebounced';
import { colors } from '@/theme';
import type { PaymentMethod } from '@/types/api';
import { formatINR, formatYM, monthStart, toYM } from '@/utils/format';

export default function PaymentsScreen() {
  const router = useRouter();
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

  const header = (
    <View className="gap-3 pb-3">
      <View>
        <PropertySwitcher />
      </View>
      <View className="rounded-lg bg-primary p-5">
        <Text variant="secondaryMedium" tone="white" className="opacity-80">{month === thisMonth ? 'Collected this month' : month ? `Collected in ${formatYM(month)}` : 'Collected, all time'}</Text>
        <Text variant="display" tone="white" className="mt-1">{formatINR(summary?.totalAmount ?? 0)}</Text>
        <Text variant="secondary" tone="white" className="opacity-80">{summary?.count ?? 0} {summary?.count === 1 ? 'payment' : 'payments'}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <View className="flex-1">{month ? <MonthStepper value={month} onChange={setMonth} /> : <View className="h-12 justify-center rounded-md border border-line-strong bg-surface px-4"><Text variant="bodyMedium">All time</Text></View>}</View>
        <Button label={month ? 'All time' : 'By month'} variant="secondary" fullWidth={false} onPress={() => setMonth(month ? null : thisMonth)} className="px-4" />
      </View>
      <Input icon={Search} placeholder="Search tenant or reference..." value={search} onChangeText={setSearch} autoCorrect={false} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2" className="flex-grow-0">
        <Chip label="All methods" selected={!method} onPress={() => setMethod(undefined)} />
        {METHODS.map((m) => <Chip key={m.value} label={m.label} selected={method === m.value} onPress={() => setMethod(m.value)} />)}
      </ScrollView>
      <Text variant="heading" className="mt-2">Recent</Text>
    </View>
  );

  let body: React.ReactNode = null;
  if (q.isLoading && !!current) body = <SkeletonList count={4} lines={2} />;
  else if (!current) body = <EmptyState icon={Banknote} title="No property yet" message="Payments appear once you start billing tenants." />;
  else if (q.isError) body = <ErrorState error={q.error} onRetry={q.refetch} />;
  else if (payments.length === 0) {
    body = <EmptyState icon={Banknote} title="No payments found" message={debounced || method || month ? 'Try a different month, method or search.' : 'Recorded payments will appear here.'} actionLabel="Record Payment" actionIcon={Plus} onAction={() => router.push('/payments/new')} />;
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="px-4"><Header title="Payments" right={<Button label="Record" icon={Plus} size="sm" fullWidth={false} onPress={() => router.push('/payments/new')} />} /></View>
      <FlatList
        data={body ? [] : payments}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        ListEmptyComponent={body}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 10, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <PaymentRow payment={item} onPress={() => router.push({ pathname: '/bills/[id]', params: { id: item.billId } })} />}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator color={colors.primary.DEFAULT} className="py-4" /> : null}
        refreshControl={<RefreshControl refreshing={q.isRefetching && !q.isFetchingNextPage} onRefresh={q.refetch} tintColor={colors.primary.DEFAULT} />}
      />
    </SafeAreaView>
  );
}
