import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import { friendlyError } from '@/api/client';
import { Button, DateField, MoneyField, Sheet, Text } from '@/components/ui';
import { formatINR, monthStart } from '@/utils/format';
import { moneyString, toNumber } from '@/utils/validation';
import { useChangeRent } from './api';

const schema = z.object({ amount: moneyString('New rent'), effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a date') });

export function ChangeRentSheet({ visible, onClose, assignmentId, currentRent, startDate }: { visible: boolean; onClose: () => void; assignmentId: string; currentRent: number; startDate: string }) {
  const change = useChangeRent(assignmentId);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, reset } = useForm({ resolver: zodResolver(schema), defaultValues: { amount: String(currentRent), effectiveFrom: monthStart() } });

  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      await change.mutateAsync({ amount: toNumber(v.amount), effectiveFrom: v.effectiveFrom });
      reset({ amount: v.amount, effectiveFrom: v.effectiveFrom });
      onClose();
    } catch (e) {
      setError(friendlyError(e));
    }
  });

  return (
    <Sheet visible={visible} title="Change Rent" onClose={onClose}>
      <View className="gap-4 pb-4">
        <Text tone="soft">Current rent is {formatINR(currentRent)}. Bills already generated are never changed.</Text>
        <MoneyField control={control} name="amount" label="New Monthly Rent" />
        <Controller control={control} name="effectiveFrom" render={({ field, fieldState }) => (
          <DateField label="Effective From" value={field.value} onChange={field.onChange} error={fieldState.error?.message} minimumDate={new Date(startDate.slice(0, 7) + '-01T00:00:00')} />
        )} />
        {error ? <Text tone="danger" variant="secondary">{error}</Text> : null}
        <Button label="Update Rent" onPress={submit} loading={change.isPending} />
      </View>
    </Sheet>
  );
}
