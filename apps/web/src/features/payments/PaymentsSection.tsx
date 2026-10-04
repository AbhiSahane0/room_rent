import { Banknote } from 'lucide-react';
import { useMemo } from 'react';
import { Button, EmptyState, ErrorState, LinkButton, SkeletonList } from '@/components/ui';
import { usePayments } from './api';
import { PaymentRow } from './PaymentRow';

export function PaymentsSection({ tenantId, canPay }: { tenantId: string; canPay: boolean }) {
  const q = usePayments({ tenantId });
  const payments = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  if (q.isLoading) return <div className="mt-4"><SkeletonList count={2} /></div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return (
    <div className="mt-4 space-y-3">
      {canPay ? <LinkButton to={`/payments/new?tenantId=${tenantId}`} icon={Banknote}>Record Payment</LinkButton> : null}
      {payments.length === 0 ? <EmptyState icon={Banknote} title="No payments yet" message="Payments received from this tenant will appear here." /> : (
        <>
          {payments.map((p) => <PaymentRow key={p.id} payment={p} showTenant={false} />)}
          {q.hasNextPage ? <Button variant="secondary" onClick={() => void q.fetchNextPage()} loading={q.isFetchingNextPage}>Load more</Button> : null}
        </>
      )}
    </div>
  );
}
