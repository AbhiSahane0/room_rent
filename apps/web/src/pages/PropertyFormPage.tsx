import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { friendlyError } from '@/api/client';
import { Button, Input, Notice, Textarea } from '@/components/ui';
import { Page } from '@/components/layout/Page';
import { useSaveProperty } from '@/features/properties/api';
import { useProperty } from '@/features/properties/PropertyProvider';
import { orUndefined } from '@/utils/validation';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter the property name').max(120),
  address: z.string().trim().min(3, 'Enter the address').max(300),
  city: z.string().trim().min(2, 'Enter the city'),
  state: z.string().trim().min(2, 'Enter the state'),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  description: z.string().trim().max(500).optional(),
});
type Form = z.infer<typeof schema>;

export function PropertyFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { properties, setCurrentId } = useProperty();
  const existing = properties.find((p) => p.id === id);
  const save = useSaveProperty(id);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { name: '', address: '', city: '', state: '', pincode: '', description: '' } });
  useEffect(() => {
    if (existing) reset({ name: existing.name, address: existing.address, city: existing.city, state: existing.state, pincode: existing.pincode, description: existing.description ?? '' });
  }, [existing, reset]);

  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      const saved = await save.mutateAsync({ ...v, description: orUndefined(v.description) });
      if (!id) setCurrentId(saved.id);
      navigate(-1);
    } catch (e) { setError(friendlyError(e)); }
  });

  return (
    <Page title={id ? 'Edit Property' : 'New Property'} back>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Property Name" placeholder="e.g. Sunrise Residency" error={errors.name?.message} {...register('name')} />
        <Textarea label="Address" placeholder="Street, area" error={errors.address?.message} {...register('address')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="City" placeholder="Pune" error={errors.city?.message} {...register('city')} />
          <Input label="State" placeholder="Maharashtra" error={errors.state?.message} {...register('state')} />
        </div>
        <Input label="Pincode" placeholder="411001" inputMode="numeric" maxLength={6} error={errors.pincode?.message} {...register('pincode')} />
        <Textarea label="Description (optional)" placeholder="Anything worth remembering" error={errors.description?.message} {...register('description')} />
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <Button type="submit" loading={save.isPending}>{id ? 'Save Changes' : 'Create Property'}</Button>
      </form>
    </Page>
  );
}
