import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleCheck, Link2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { friendlyError } from '@/api/client';
import { Button, Card, ConfirmDialog, ErrorState, Header, Icon, Screen, SectionHeader, SkeletonList, Text } from '@/components/ui';
import { useBill, useCancelBill } from '@/features/bills/api';
import { BillStatusBadge } from '@/features/bills/BillCard';
import { formatDate, formatINR, formatMonth } from '@/utils/format';
import type { BillItemRow } from '@/types/api';

function itemLabel(i: BillItemRow) {
  return i.type === 'ELECTRICITY' && i.meta?.currentReading != null ? `Electricity (${i.meta.units} units × ${formatINR(i.meta.ratePerUnit)})` : i.description;
}

export default function BillDetailScreen() {
  const router = useRouter();
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const { data: bill, isLoading, isError, error, refetch, isRefetching } = useBill(id);
  const cancel = useCancelBill(id);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) return <Screen><Header title="Bill" /><SkeletonList count={2} lines={4} /></Screen>;
  if (isError || !bill) return <Screen><Header title="Bill" /><ErrorState error={error} onRetry={refetch} /></Screen>;

  const cancelled = bill.status === 'CANCELLED';
  const canCancel = !cancelled && bill.paidAmount === 0 && !bill.carriedInto;

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch} edges={['top']}>
      <Header title={formatMonth(bill.billingPeriod)} subtitle={bill.billNumber} />

      {created === '1' ? (
        <View className="mb-3 flex-row items-center gap-3 rounded-lg bg-success-soft p-4">
          <Icon icon={CircleCheck} size="lg" tone="success" />
          <View className="flex-1">
            <Text variant="heading" tone="success">Bill Generated</Text>
            <Text variant="secondary" tone="success">The totals were calculated and verified by the server.</Text>
          </View>
        </View>
      ) : null}

      <Card className="gap-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text variant="heading">{bill.tenant.fullName}</Text>
            <Text variant="secondary" tone="soft">Room {bill.room.roomNumber} · {bill.property.name}</Text>
          </View>
          <BillStatusBadge status={bill.status} />
        </View>
        <Text variant="secondary" tone="muted">Due {formatDate(bill.dueDate)}</Text>
      </Card>

      <SectionHeader title="Charges" />
      <Card>
        {bill.items.map((i, idx) => (
          <View key={i.id} className={`min-h-11 flex-row items-center justify-between gap-4 py-2.5 ${idx < bill.items.length - 1 ? 'border-b border-line' : ''}`}>
            <Text tone={i.type === 'PREVIOUS_BALANCE' ? 'danger' : 'soft'} className="flex-1" variant="secondary">{itemLabel(i)}</Text>
            <Text variant="bodyMedium" tone={i.amount < 0 ? 'success' : 'ink'}>{i.amount < 0 ? `-${formatINR(-i.amount)}` : formatINR(i.amount)}</Text>
          </View>
        ))}
        <View className="mt-1 gap-1 border-t-2 border-line-strong pt-3">
          <View className="flex-row items-center justify-between"><Text variant="heading">Total</Text><Text variant="title">{formatINR(bill.totalDue)}</Text></View>
          <View className="flex-row items-center justify-between"><Text tone="soft">Paid</Text><Text variant="bodyMedium" tone="success">{formatINR(bill.paidAmount)}</Text></View>
          <View className="flex-row items-center justify-between"><Text tone="soft">Balance</Text><Text variant="heading" tone={bill.balance > 0 && !bill.carriedInto ? 'danger' : 'ink'}>{formatINR(bill.balance)}</Text></View>
        </View>
      </Card>

      {bill.carriedInto ? (
        <LinkCard onPress={() => router.push({ pathname: '/bills/[id]', params: { id: bill.carriedInto!.id } })} label={`Balance carried forward to ${bill.carriedInto.billNumber}`} />
      ) : null}
      {bill.absorbed.length ? (
        <View className="mt-3 flex-row items-center gap-2"><Icon icon={Link2} size="sm" tone="muted" /><Text variant="secondary" tone="muted" className="flex-1">Includes unpaid balance from {bill.absorbed.map((b) => b.billNumber).join(', ')}</Text></View>
      ) : null}
      {bill.notes ? <Text variant="secondary" tone="soft" className="mt-3">{bill.notes}</Text> : null}

      {canCancel ? (
        <View className="mt-6">
          <Button label="Cancel Bill" variant="danger" onPress={() => setConfirming(true)} />
          {actionError ? <Text tone="danger" variant="secondary" className="mt-2">{actionError}</Text> : null}
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirming}
        title="Cancel this bill?"
        message="The bill is kept for your records but no longer counts toward what the tenant owes. You can generate it again afterwards."
        confirmLabel="Cancel bill"
        destructive
        loading={cancel.isPending}
        onConfirm={async () => { try { await cancel.mutateAsync(undefined); setConfirming(false); } catch (e) { setConfirming(false); setActionError(friendlyError(e)); } }}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}

function LinkCard({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Card onPress={onPress} className="mt-3 flex-row items-center gap-2">
      <Icon icon={Link2} tone="primary" />
      <Text variant="secondaryMedium" tone="primary" className="flex-1">{label}</Text>
    </Card>
  );
}
