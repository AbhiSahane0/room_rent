import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import type { z } from 'zod';
import { friendlyError } from '@/api/client';
import { Button, DateInput, ErrorState, Input, Notice, SkeletonList, Textarea } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { useTenant, useUpdateTenant } from '@/features/tenants/api';
import { emptyTenantForm, tenantFormSchema, tenantPayload } from '@/features/tenants/schemas';

const schema = tenantFormSchema.pick({
  fullName: true, joiningDate: true, occupation: true, notes: true, phone: true, alternatePhone: true, email: true,
  permanentAddress: true, currentAddress: true, emergencyContact: true, emergencyPhone: true,
});
type Form = z.infer<typeof schema>;

export function EditTenantPage() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const { data: t, isLoading, isError, error, refetch } = useTenant(id);
  const update = useUpdateTenant(id);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (t) reset({
      fullName: t.fullName, joiningDate: t.joiningDate.slice(0, 10), occupation: t.occupation ?? '', notes: t.notes ?? '', phone: t.phone,
      alternatePhone: t.alternatePhone ?? '', email: t.email ?? '', permanentAddress: t.permanentAddress ?? '', currentAddress: t.currentAddress ?? '',
      emergencyContact: t.emergencyContact ?? '', emergencyPhone: t.emergencyPhone ?? '',
    });
  }, [t, reset]);

  const submit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await update.mutateAsync(tenantPayload({ ...emptyTenantForm, ...v }));
      navigate(-1);
    } catch (e) { setFormError(friendlyError(e)); }
  });

  if (isLoading) return <Page title="Edit Tenant" back><SkeletonList count={2} /></Page>;
  if (isError) return <Page title="Edit Tenant" back><ErrorState error={error} onRetry={() => void refetch()} /></Page>;

  return (
    <Page title="Edit Tenant" subtitle={t?.fullName} back>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Full Name" autoComplete="off" error={errors.fullName?.message} {...register('fullName')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Phone" type="tel" error={errors.phone?.message} {...register('phone')} />
          <Input label="Alternate Phone" type="tel" error={errors.alternatePhone?.message} {...register('alternatePhone')} />
        </div>
        <Input label="Email" type="email" autoCapitalize="none" error={errors.email?.message} {...register('email')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <DateInput label="Joining Date" error={errors.joiningDate?.message} {...register('joiningDate')} />
          <Input label="Occupation" {...register('occupation')} />
        </div>
        <Textarea label="Current Address" {...register('currentAddress')} />
        <Textarea label="Permanent Address" {...register('permanentAddress')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Emergency Contact" {...register('emergencyContact')} />
          <Input label="Emergency Phone" type="tel" error={errors.emergencyPhone?.message} {...register('emergencyPhone')} />
        </div>
        <Textarea label="Notes" {...register('notes')} />
        {formError ? <Notice tone="danger">{formError}</Notice> : null}
        <Button type="submit" loading={update.isPending}>Save Changes</Button>
      </form>
    </Page>
  );
}
