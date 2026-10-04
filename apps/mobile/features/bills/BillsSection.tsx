import { useRouter } from 'expo-router';
import { Plus, Receipt } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { Button, EmptyState, ErrorState, SkeletonList } from '@/components/ui';
import { useBills } from './api';
import { BillCard } from './BillCard';

/** Billing history for one tenant, newest first. */
export function BillsSection({ tenantId, canBill }: { tenantId: string; canBill: boolean }) {
  const router = useRouter();
  const q = useBills({ tenantId });
  const bills = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);

  if (q.isLoading) return <View className="mt-4"><SkeletonList count={2} lines={3} /></View>;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  return (
    <View className="mt-4 gap-3">
      {canBill ? <Button label="Generate Bill" icon={Plus} onPress={() => router.push({ pathname: '/bills/new', params: { tenantId } })} /> : null}
      {bills.length === 0 ? (
        <EmptyState icon={Receipt} title="No bills yet" message="Monthly bills for this tenant will appear here." />
      ) : (
        <>
          {bills.map((b) => <BillCard key={b.id} bill={b} showTenant={false} onPress={() => router.push({ pathname: '/bills/[id]', params: { id: b.id } })} />)}
          {q.hasNextPage ? <Button label="Load more" variant="secondary" onPress={() => q.fetchNextPage()} loading={q.isFetchingNextPage} /> : null}
        </>
      )}
    </View>
  );
}
