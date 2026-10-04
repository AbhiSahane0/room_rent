import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import { friendlyError } from '@/api/client';
import { Button, ErrorState, Header, MoneyField, Screen, SegmentedControl, SelectField, SkeletonList, Text, TextField } from '@/components/ui';
import { useProperty } from '@/features/properties/PropertyProvider';
import { useRoom, useSaveRoom } from '@/features/rooms/api';
import { moneyString, optionalMoneyString, orUndefined, toNumber, toOptionalNumber } from '@/utils/validation';

const schema = z.object({
  roomNumber: z.string().trim().min(1, 'Enter the room number').max(20),
  floor: z.string().trim().max(40).optional(),
  defaultRent: moneyString('Monthly rent'),
  electricityMode: z.enum(['METER', 'FIXED', 'NONE']),
  ratePerUnit: optionalMoneyString,
  fixedElectricity: optionalMoneyString,
  status: z.enum(['VACANT', 'MAINTENANCE']).optional(),
  notes: z.string().trim().max(500).optional(),
});
type Form = z.infer<typeof schema>;

export default function RoomFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { current } = useProperty();
  const roomQuery = useRoom(id);
  const save = useSaveRoom(id);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, reset, setValue, setError: setFieldError } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { roomNumber: '', floor: '', defaultRent: '', electricityMode: 'METER', ratePerUnit: '', fixedElectricity: '', status: 'VACANT', notes: '' },
  });
  const mode = useWatch({ control, name: 'electricityMode' });
  const room = roomQuery.data;

  useEffect(() => {
    if (room) {
      reset({
        roomNumber: room.roomNumber, floor: room.floor ?? '', defaultRent: String(room.defaultRent), electricityMode: room.electricityMode,
        ratePerUnit: room.ratePerUnit != null ? String(room.ratePerUnit) : '', fixedElectricity: room.fixedElectricity != null ? String(room.fixedElectricity) : '',
        status: room.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'VACANT', notes: room.notes ?? '',
      });
    }
  }, [room, reset]);

  const submit = handleSubmit(async (v) => {
    setError(null);
    if (v.electricityMode === 'METER' && !v.ratePerUnit) return setFieldError('ratePerUnit', { message: 'Enter the rate per unit' });
    if (v.electricityMode === 'FIXED' && !v.fixedElectricity) return setFieldError('fixedElectricity', { message: 'Enter the fixed amount' });
    const body: Record<string, unknown> = {
      roomNumber: v.roomNumber, floor: orUndefined(v.floor), defaultRent: toNumber(v.defaultRent), electricityMode: v.electricityMode,
      ratePerUnit: v.electricityMode === 'METER' ? toOptionalNumber(v.ratePerUnit) : undefined,
      fixedElectricity: v.electricityMode === 'FIXED' ? toOptionalNumber(v.fixedElectricity) : undefined,
      notes: orUndefined(v.notes),
    };
    if (id) { if (room?.status !== 'OCCUPIED') body.status = v.status; } else body.propertyId = current?.id;
    try {
      await save.mutateAsync(body);
      router.back();
    } catch (e) {
      setError(friendlyError(e));
    }
  });

  if (id && roomQuery.isLoading) return <Screen><Header title="Edit Room" /><SkeletonList count={2} /></Screen>;
  if (id && roomQuery.isError) return <Screen><Header title="Edit Room" /><ErrorState error={roomQuery.error} onRetry={roomQuery.refetch} /></Screen>;

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={<View className="px-4 pb-4 pt-2"><Button label={id ? 'Save Changes' : 'Add Room'} onPress={submit} loading={save.isPending} /></View>}
    >
      <Header title={id ? `Edit Room ${room?.roomNumber ?? ''}` : 'Add Room'} subtitle={current?.name} />
      <View className="gap-4 pt-2">
        <TextField control={control} name="roomNumber" label="Room Number" placeholder="101" autoCapitalize="characters" />
        <TextField control={control} name="floor" label="Floor (optional)" placeholder="Ground, 1st, 2nd" />
        <MoneyField control={control} name="defaultRent" label="Monthly Rent" />
        <View className="gap-1.5">
          <Text variant="label" tone="soft">Electricity</Text>
          <SegmentedControl
            value={mode}
            onChange={(v) => setValue('electricityMode', v)}
            options={[{ value: 'METER', label: 'Meter' }, { value: 'FIXED', label: 'Fixed' }, { value: 'NONE', label: 'None' }]}
          />
        </View>
        {mode === 'METER' ? <MoneyField control={control} name="ratePerUnit" label="Rate per Unit" hint="Charged per unit (kWh) of meter reading" /> : null}
        {mode === 'FIXED' ? <MoneyField control={control} name="fixedElectricity" label="Fixed Monthly Electricity" /> : null}
        {id && room?.status !== 'OCCUPIED' ? (
          <SelectField control={control} name="status" label="Status" options={[{ value: 'VACANT', label: 'Vacant', hint: 'Available to assign' }, { value: 'MAINTENANCE', label: 'Maintenance', hint: 'Not available for rent' }]} />
        ) : null}
        <TextField control={control} name="notes" label="Notes (optional)" multiline placeholder="Furnishing, meter number, etc." />
        {error ? <Text tone="danger" variant="secondary">{error}</Text> : null}
      </View>
    </Screen>
  );
}
