import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import { friendlyError } from '@/api/client';
import { Button, Card, ConfirmDialog, DateField, DetailRow, ErrorState, Header, Icon, Screen, SkeletonList, Text, TextField } from '@/components/ui';
import { useMoveOut, useTenant } from '@/features/tenants/api';
import { formatINR, today } from '@/utils/format';
import { optionalMoneyString, orUndefined, toOptionalNumber } from '@/utils/validation';

const schema = z.object({ moveOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a date'), finalMeterReading: optionalMoneyString, notes: z.string().trim().max(500) });

export default function MoveOutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: t, isLoading, isError, error, refetch } = useTenant(id);
  const a = t?.currentAssignment;
  const moveOut = useMoveOut(a?.id ?? '');
  const [confirming, setConfirming] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm({ resolver: zodResolver(schema), defaultValues: { moveOutDate: today(), finalMeterReading: '', notes: '' } });

  const run = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await moveOut.mutateAsync({ moveOutDate: v.moveOutDate, finalMeterReading: toOptionalNumber(v.finalMeterReading), notes: orUndefined(v.notes) });
      setConfirming(false);
      router.replace({ pathname: '/tenants/[id]', params: { id } });
    } catch (e) {
      setConfirming(false);
      setFormError(friendlyError(e));
    }
  });

  if (isLoading) return <Screen><Header title="Move Out Tenant" /><SkeletonList count={2} /></Screen>;
  if (isError || !t) return <Screen><Header title="Move Out Tenant" /><ErrorState error={error} onRetry={refetch} /></Screen>;
  if (!a) return <Screen><Header title="Move Out Tenant" /><Card><Text tone="soft">{t.fullName} has already moved out.</Text></Card></Screen>;

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={<View className="px-4 pb-4 pt-2"><Button label="Move Out Tenant" variant="danger" onPress={handleSubmit(() => setConfirming(true))} /></View>}
    >
      <Header title="Move Out Tenant" subtitle={`${t.fullName} · Room ${a.room.roomNumber}`} />
      <View className="gap-4 pt-2">
        <Controller control={control} name="moveOutDate" render={({ field, fieldState }) => (
          <DateField label="Move-out Date" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
        )} />
        {a.electricityMode === 'METER' ? (
          <TextField control={control} name="finalMeterReading" label="Final Meter Reading" keyboardType="decimal-pad" placeholder="e.g. 1350" hint={`Opening reading was ${a.initialMeterReading ?? 0}`} />
        ) : null}
        <Card>
          <DetailRow label="Final balance" value={t.outstanding > 0 ? formatINR(t.outstanding) : 'Nil'} tone={t.outstanding > 0 ? 'danger' : 'success'} strong last />
        </Card>
        {t.outstanding > 0 ? (
          <View className="flex-row gap-2 rounded-md bg-warning-soft p-3">
            <Icon icon={TriangleAlert} tone="warning" />
            <Text variant="secondary" tone="warning" className="flex-1">This tenant still owes {formatINR(t.outstanding)}. The balance stays on record after move-out.</Text>
          </View>
        ) : null}
        <TextField control={control} name="notes" label="Notes (optional)" multiline placeholder="Condition of room, deposit settlement, etc." />
        {formError ? <Text tone="danger" variant="secondary">{formError}</Text> : null}
      </View>
      <ConfirmDialog
        visible={confirming}
        title="Move out this tenant?"
        message={`Room ${a.room.roomNumber} will become vacant. All bills, payments and documents are kept.`}
        confirmLabel="Move out"
        destructive
        loading={moveOut.isPending}
        onConfirm={run}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}
