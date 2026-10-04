import { useRouter } from 'expo-router';
import { Banknote } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { Button, EmptyState, ErrorState, SkeletonList } from '@/components/ui';
import { usePayments } from './api';
import { PaymentRow } from './PaymentRow';

export function PaymentsSection({ tenantId, canPay }: { tenantId: string; canPay: boolean }) {
  const router = useRouter();
  const q = usePayments({ tenantId });
  const payments = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);

  if (q.isLoading) return <View className="mt-4"><SkeletonList count={2} lines={2} /></View>;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  return (
    <View className="mt-4 gap-3">
      {canPay ? <Button label="Record Payment" icon={Banknote} onPress={() => router.push({ pathname: '/payments/new', params: { tenantId } })} /> : null}
      {payments.length === 0 ? (
        <EmptyState icon={Banknote} title="No payments yet" message="Payments received from this tenant will appear here." />
      ) : (
        <>
          {payments.map((p) => <PaymentRow key={p.id} payment={p} showTenant={false} onPress={() => router.push({ pathname: '/bills/[id]', params: { id: p.billId } })} />)}
          {q.hasNextPage ? <Button label="Load more" variant="secondary" onPress={() => q.fetchNextPage()} loading={q.isFetchingNextPage} /> : null}
        </>
      )}
    </View>
  );
}
