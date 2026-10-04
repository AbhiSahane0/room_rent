import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { friendlyError } from '@/api/client';
import { Button, ErrorState, Field, Input, MoneyInput, Notice, Segmented, Select, SkeletonList, Textarea } from '@/components/ui';
import { Page } from '@/components/layout/Page';
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

export function RoomFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { current } = useProperty();
  const roomQuery = useRoom(id);
  const save = useSaveRoom(id);
  const [error, setError] = useState<string | null>(null);
  const { register, control, handleSubmit, reset, setValue, getValues, setError: setFieldError, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { roomNumber: '', floor: '', defaultRent: '', electricityMode: 'METER', ratePerUnit: '', fixedElectricity: '', status: 'VACANT', notes: '' },
  });
  const mode = useWatch({ control, name: 'electricityMode' });
  const room = roomQuery.data;
  // A new room starts with the property's default rate, which you can change for this room.
  useEffect(() => {
    if (!id && current && getValues('ratePerUnit') === '') setValue('ratePerUnit', String(current.defaultRatePerUnit));
  }, [id, current, getValues, setValue]);
  useEffect(() => {
    if (room) reset({
      roomNumber: room.roomNumber, floor: room.floor ?? '', defaultRent: String(room.defaultRent), electricityMode: room.electricityMode,
      ratePerUnit: room.ratePerUnit != null ? String(room.ratePerUnit) : '', fixedElectricity: room.fixedElectricity != null ? String(room.fixedElectricity) : '',
      status: room.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'VACANT', notes: room.notes ?? '',
    });
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
      navigate(-1);
    } catch (e) { setError(friendlyError(e)); }
  });

  if (id && roomQuery.isLoading) return <Page title="Edit Room" back><SkeletonList count={2} /></Page>;
  if (id && roomQuery.isError) return <Page title="Edit Room" back><ErrorState error={roomQuery.error} onRetry={() => void roomQuery.refetch()} /></Page>;

  return (
    <Page title={id ? `Edit Room ${room?.roomNumber ?? ''}` : 'Add Room'} subtitle={current?.name} back>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Room Number" placeholder="101" error={errors.roomNumber?.message} {...register('roomNumber')} />
        <Input label="Floor (optional)" placeholder="Ground, 1st, 2nd" {...register('floor')} />
        <MoneyInput label="Monthly Rent" error={errors.defaultRent?.message} {...register('defaultRent')} />
        <Field label="Electricity">
          <Controller control={control} name="electricityMode" render={({ field }) => <Segmented value={field.value} onChange={field.onChange} options={[{ value: 'METER', label: 'Meter' }, { value: 'FIXED', label: 'Fixed' }, { value: 'NONE', label: 'None' }]} />} />
        </Field>
        {mode === 'METER' ? <MoneyInput label="Rate per Unit" hint={`Each room can have its own rate. New rooms start at the property's default${current ? ` (₹${current.defaultRatePerUnit})` : ''}.`} error={errors.ratePerUnit?.message} {...register('ratePerUnit')} /> : null}
        {mode === 'FIXED' ? <MoneyInput label="Fixed Monthly Electricity" error={errors.fixedElectricity?.message} {...register('fixedElectricity')} /> : null}
        {id && room?.status !== 'OCCUPIED' ? <Select label="Status" options={[{ value: 'VACANT', label: 'Vacant' }, { value: 'MAINTENANCE', label: 'Maintenance' }]} {...register('status')} /> : null}
        <Textarea label="Notes (optional)" placeholder="Furnishing, meter number, etc." {...register('notes')} />
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <Button type="submit" loading={save.isPending}>{id ? 'Save Changes' : 'Add Room'}</Button>
      </form>
    </Page>
  );
}
