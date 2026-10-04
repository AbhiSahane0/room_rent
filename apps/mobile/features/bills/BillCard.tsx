import { View } from 'react-native';
import { Badge, BadgeTone, Card, Text } from '@/components/ui';
import { formatINR, formatMonth } from '@/utils/format';
import type { BillListItem, BillStatus } from '@/types/api';

export const BILL_STATUS: Record<BillStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  GENERATED: { label: 'Unpaid', tone: 'warning' },
  PARTIALLY_PAID: { label: 'Partially paid', tone: 'primary' },
  PAID: { label: 'Paid', tone: 'success' },
  OVERDUE: { label: 'Overdue', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export function BillStatusBadge({ status }: { status: BillStatus }) {
  const s = BILL_STATUS[status];
  return <Badge label={s.label} tone={s.tone} />;
}

export function BillCard({ bill, onPress, showTenant = true }: { bill: BillListItem; onPress: () => void; showTenant?: boolean }) {
  const cancelled = bill.status === 'CANCELLED';
  const carried = !!bill.carriedForwardToId;
  return (
    <Card onPress={onPress} className="gap-2">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text variant="heading">{formatMonth(bill.billingPeriod)}</Text>
          {showTenant ? <Text variant="secondary" tone="soft">{bill.tenant.fullName} · Room {bill.room.roomNumber}</Text> : <Text variant="secondary" tone="muted">{bill.billNumber}</Text>}
        </View>
        <BillStatusBadge status={bill.status} />
      </View>
      <View className="flex-row items-end justify-between">
        <Text variant="number" tone={cancelled ? 'muted' : 'ink'} className={cancelled ? 'line-through' : ''}>{formatINR(bill.totalDue)}</Text>
        {cancelled ? null : carried ? (
          <Text variant="secondary" tone="muted">Carried forward</Text>
        ) : bill.status === 'PAID' ? (
          <Text variant="secondaryMedium" tone="success">Paid in full</Text>
        ) : (
          <View className="items-end">
            {bill.paidAmount > 0 ? <Text variant="caption" tone="muted">{formatINR(bill.paidAmount)} paid</Text> : null}
            <Text variant="bodyMedium" tone="danger" className="font-semibold">{formatINR(bill.balance)} pending</Text>
          </View>
        )}
      </View>
    </Card>
  );
}
