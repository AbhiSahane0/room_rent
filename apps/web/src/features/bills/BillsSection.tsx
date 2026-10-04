import { Plus, Receipt } from 'lucide-react';
import { useMemo } from 'react';
import { Button, EmptyState, ErrorState, LinkButton, SkeletonList } from '@/components/ui';
import { useBills } from './api';
import { BillCard } from './BillCard';

/** Billing history for one tenant, newest first. */
export function BillsSection({ tenantId, canBill }: { tenantId: string; canBill: boolean }) {
  const q = useBills({ tenantId });
  const bills = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  if (q.isLoading) return <div className="mt-4"><SkeletonList count={2} /></div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return (
    <div className="mt-4 space-y-3">
      {canBill ? <LinkButton to={`/bills/new?tenantId=${tenantId}`} icon={Plus}>Generate Bill</LinkButton> : null}
      {bills.length === 0 ? <EmptyState icon={Receipt} title="No bills yet" message="Monthly bills for this tenant will appear here." /> : (
        <>
          {bills.map((b) => <BillCard key={b.id} bill={b} showTenant={false} />)}
          {q.hasNextPage ? <Button variant="secondary" onClick={() => void q.fetchNextPage()} loading={q.isFetchingNextPage}>Load more</Button> : null}
        </>
      )}
    </div>
  );
}
