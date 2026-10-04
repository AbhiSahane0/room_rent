import { zodResolver } from '@hookform/resolvers/zod';
import { Receipt } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { friendlyError } from '@/api/client';
import { Button, EmptyState, Input, MoneyInput, Notice, Textarea } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { useSaveProperty } from '@/features/properties/api';
import { useProperty } from '@/features/properties/PropertyProvider';
import { moneyString, orUndefined, toNumber } from '@/utils/validation';

const schema = z.object({
  billPrefix: z.string().trim().regex(/^[A-Za-z0-9]{1,8}$/, 'Use 1 to 8 letters or numbers'),
  dueDayOfMonth: z.string().trim().regex(/^\d+$/, 'Enter a day from 1 to 28').refine((v) => Number(v) >= 1 && Number(v) <= 28, 'Enter a day from 1 to 28'),
  defaultRatePerUnit: moneyString('Rate'),
  billFooterNote: z.string().trim().max(300),
});
type Form = z.infer<typeof schema>;

export function BillSettingsPage() {
  const navigate = useNavigate();
  const { current } = useProperty();
  const save = useSaveProperty(current?.id);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { billPrefix: '', dueDayOfMonth: '', defaultRatePerUnit: '', billFooterNote: '' } });
  useEffect(() => {
    if (current) reset({ billPrefix: current.billPrefix, dueDayOfMonth: String(current.dueDayOfMonth), defaultRatePerUnit: String(current.defaultRatePerUnit), billFooterNote: current.billFooterNote ?? '' });
  }, [current, reset]);

  if (!current) return <Page title="Bill Settings" back><EmptyState icon={Receipt} title="No property yet" message="Add a property to configure its bills." /></Page>;

  const submit = handleSubmit(async (v) => {
    setError(null); setSaved(false);
    try {
      await save.mutateAsync({ billPrefix: v.billPrefix.toUpperCase(), dueDayOfMonth: Number(v.dueDayOfMonth), defaultRatePerUnit: toNumber(v.defaultRatePerUnit), billFooterNote: orUndefined(v.billFooterNote) ?? '' });
      setSaved(true);
      setTimeout(() => navigate(-1), 600);
    } catch (e) { setError(friendlyError(e)); }
  });

  return (
    <Page title="Bill Settings" subtitle={current.name} back>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Bill Number Prefix" placeholder="INV" autoCapitalize="characters" hint="Bills are numbered like SUN-202610-0001" error={errors.billPrefix?.message} {...register('billPrefix')} />
        <Input label="Due Day of Month" placeholder="10" inputMode="numeric" maxLength={2} hint="New bills fall due on this day (1 to 28)" error={errors.dueDayOfMonth?.message} {...register('dueDayOfMonth')} />
        <MoneyInput label="Default Electricity Rate per Unit" hint="Used for new rooms and tenants that do not set their own rate" error={errors.defaultRatePerUnit?.message} {...register('defaultRatePerUnit')} />
        <Textarea label="Invoice Footer Note" placeholder="e.g. Please pay by UPI to rent@upi" hint="Printed at the bottom of every PDF invoice" error={errors.billFooterNote?.message} {...register('billFooterNote')} />
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <Button type="submit" loading={save.isPending}>{saved ? 'Saved' : 'Save Settings'}</Button>
      </form>
    </Page>
  );
}
