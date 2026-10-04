import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { friendlyError } from '@/api/client';
import { Button, Card, ConfirmDialog, DateInput, DetailRow, ErrorState, Input, Notice, SkeletonList, Textarea } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { useMoveOut, useTenant } from '@/features/tenants/api';
import { formatINR, today } from '@/utils/format';
import { optionalMoneyString, orUndefined, toOptionalNumber } from '@/utils/validation';

const schema = z.object({ moveOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a date'), finalMeterReading: optionalMoneyString, notes: z.string().trim().max(500) });
type Form = z.infer<typeof schema>;

export function MoveOutPage() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const { data: t, isLoading, isError, error, refetch } = useTenant(id);
  const a = t?.currentAssignment;
  const moveOut = useMoveOut(a?.id ?? '');
  const [confirming, setConfirming] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { moveOutDate: today(), finalMeterReading: '', notes: '' } });

  const run = async () => {
    const v = getValues();
    setFormError(null);
    try {
      await moveOut.mutateAsync({ moveOutDate: v.moveOutDate, finalMeterReading: toOptionalNumber(v.finalMeterReading), notes: orUndefined(v.notes) });
      setConfirming(false);
      navigate(`/tenants/${id}`, { replace: true });
    } catch (e) { setConfirming(false); setFormError(friendlyError(e)); }
  };

  if (isLoading) return <Page title="Move Out Tenant" back><SkeletonList count={2} /></Page>;
  if (isError || !t) return <Page title="Move Out Tenant" back><ErrorState error={error} onRetry={() => void refetch()} /></Page>;
  if (!a) return <Page title="Move Out Tenant" back><Card><span className="text-ink-soft">{t.fullName} has already moved out.</span></Card></Page>;

  return (
    <Page title="Move Out Tenant" subtitle={`${t.fullName} · Room ${a.room.roomNumber}`} back>
      <form onSubmit={handleSubmit(() => setConfirming(true))} className="space-y-4" noValidate>
        <DateInput label="Move-out Date" error={errors.moveOutDate?.message} {...register('moveOutDate')} />
        {a.electricityMode === 'METER' ? <Input label="Final Meter Reading" inputMode="decimal" placeholder="e.g. 1350" hint={`Opening reading was ${a.initialMeterReading ?? 0}`} error={errors.finalMeterReading?.message} {...register('finalMeterReading')} /> : null}
        <Card><DetailRow label="Final balance" value={t.outstanding > 0 ? formatINR(t.outstanding) : 'Nil'} tone={t.outstanding > 0 ? 'danger' : 'success'} strong last /></Card>
        {t.outstanding > 0 ? <Notice tone="warning">This tenant still owes {formatINR(t.outstanding)}. The balance stays on record after move-out.</Notice> : null}
        <Textarea label="Notes (optional)" placeholder="Condition of room, deposit settlement, etc." {...register('notes')} />
        {formError ? <Notice tone="danger">{formError}</Notice> : null}
        <Button type="submit" variant="danger">Move Out Tenant</Button>
      </form>
      <ConfirmDialog open={confirming} title="Move out this tenant?" message={`Room ${a.room.roomNumber} will become vacant. All bills, payments and documents are kept.`} confirmLabel="Move out" destructive loading={moveOut.isPending} onConfirm={() => void run()} onCancel={() => setConfirming(false)} />
    </Page>
  );
}
