import { useRouter } from 'expo-router';
import { Zap } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Card, DetailRow, EmptyState, ErrorState, SectionHeader, SkeletonList, Text } from '@/components/ui';
import { formatINR, formatMonth, formatMonthShort } from '@/utils/format';
import { useTenantElectricity } from './api';

/** Month-by-month electricity for one tenant: totals, a 12-month chart and every bill's readings. */
export function ElectricityHistory({ tenantId, currentRate }: { tenantId: string; currentRate?: number | null }) {
  const router = useRouter();
  const q = useTenantElectricity(tenantId);
  if (q.isLoading) return <View className="mt-4"><SkeletonList count={2} lines={3} /></View>;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const { rows, summary: s } = q.data!;
  if (rows.length === 0) return <View className="mt-4"><EmptyState icon={Zap} title="No electricity charged yet" message="Each month's electricity will be listed here once bills are generated." /></View>;

  const recent = [...rows].slice(0, 12).reverse();
  const max = Math.max(1, ...recent.map((r) => r.amount));
  const height = 100;
  return (
    <View className="mt-4 gap-3">
      <View className="flex-row gap-3">
        <Card className="flex-1 gap-0.5"><Text variant="caption" tone="muted">Total charged</Text><Text variant="heading">{formatINR(s.totalAmount)}</Text><Text variant="caption" tone="muted">{s.months} {s.months === 1 ? 'month' : 'months'}</Text></Card>
        <Card className="flex-1 gap-0.5"><Text variant="caption" tone="muted">Average a month</Text><Text variant="heading">{formatINR(s.averageMonthly)}</Text></Card>
      </View>
      <View className="flex-row gap-3">
        <Card className="flex-1 gap-0.5"><Text variant="caption" tone="muted">Highest month</Text><Text variant="heading">{s.highest ? formatINR(s.highest.amount) : '-'}</Text><Text variant="caption" tone="muted">{s.highest ? formatMonth(s.highest.month) : ' '}</Text></Card>
        <Card className="flex-1 gap-0.5"><Text variant="caption" tone="muted">Current rate</Text><Text variant="heading">{(currentRate ?? s.latestRate) != null ? `${formatINR(currentRate ?? s.latestRate)} / unit` : '-'}</Text>{s.totalUnits != null ? <Text variant="caption" tone="muted">{s.totalUnits} units metered</Text> : null}</Card>
      </View>

      <Card>
        <View className="flex-row items-end justify-between gap-1" style={{ height }} accessible accessibilityLabel={`Electricity by month. ${recent.map((r) => `${formatMonthShort(r.month)} ${formatINR(r.amount)}`).join(', ')}`}>
          {recent.map((r) => (
            <View key={r.billId} className="flex-1 items-center justify-end" style={{ height }}>
              <View className="w-full max-w-5 rounded-t-sm bg-primary/70" style={{ height: Math.max(4, (r.amount / max) * height) }} />
            </View>
          ))}
        </View>
        <View className="mt-1.5 flex-row justify-between gap-1">
          {recent.map((r) => <Text key={r.billId} variant="caption" tone="muted" className="flex-1 text-center" style={{ fontSize: 10 }}>{formatMonthShort(r.month).split(' ')[0]}</Text>)}
        </View>
      </Card>

      <SectionHeader title="Every month" />
      <Card padded={false}>
        {rows.map((r, i) => (
          <Pressable key={r.billId} onPress={() => router.push({ pathname: '/bills/[id]', params: { id: r.billId } })} accessibilityRole="button" className={`flex-row items-center gap-3 px-4 py-3 active:bg-surface-muted ${i < rows.length - 1 ? 'border-b border-line' : ''}`}>
            <View className="flex-1">
              <Text variant="bodyMedium">{formatMonth(r.month)}</Text>
              <Text variant="secondary" tone="soft" numberOfLines={2}>
                {r.currentReading != null ? `Meter ${r.previousReading} to ${r.currentReading} · ${r.units} units × ${formatINR(r.ratePerUnit)}` : r.adjusted ? 'Amount recorded without meter readings' : 'Amount'}
                {r.roomNumber ? ` · Room ${r.roomNumber}` : ''}
              </Text>
            </View>
            <Text variant="heading">{formatINR(r.amount)}</Text>
          </Pressable>
        ))}
      </Card>
      <DetailRow label="Months with a meter reading" value={String(rows.filter((r) => r.currentReading != null).length)} last />
    </View>
  );
}
