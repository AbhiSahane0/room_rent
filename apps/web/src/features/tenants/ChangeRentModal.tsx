import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { friendlyError } from '@/api/client';
import { Button, DateInput, MoneyInput, Modal, Notice } from '@/components/ui';
import { formatINR, monthStart } from '@/utils/format';
import { moneyString, toNumber } from '@/utils/validation';
import { useChangeRent } from './api';

const schema = z.object({ amount: moneyString('New rent'), effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a date') });
type Form = z.infer<typeof schema>;

export function ChangeRentModal({ open, onClose, assignmentId, currentRent, startDate }: { open: boolean; onClose: () => void; assignmentId: string; currentRent: number; startDate: string }) {
  const change = useChangeRent(assignmentId);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { amount: String(currentRent), effectiveFrom: monthStart() } });
  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      await change.mutateAsync({ amount: toNumber(v.amount), effectiveFrom: v.effectiveFrom });
      onClose();
    } catch (e) { setError(friendlyError(e)); }
  });
  return (
    <Modal open={open} title="Change Rent" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 pb-2" noValidate>
        <p className="text-ink-soft">Current rent is {formatINR(currentRent)}. Bills already generated are never changed.</p>
        <MoneyInput label="New Monthly Rent" error={errors.amount?.message} {...register('amount')} />
        <DateInput label="Effective From" min={`${startDate.slice(0, 7)}-01`} error={errors.effectiveFrom?.message} {...register('effectiveFrom')} />
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <Button type="submit" loading={change.isPending}>Update Rent</Button>
      </form>
    </Modal>
  );
}
