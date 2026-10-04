import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import { friendlyError } from '@/api/client';
import { Button, Header, Screen, Text, TextField } from '@/components/ui';
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

export default function PropertyFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { properties, setCurrentId } = useProperty();
  const existing = properties.find((p) => p.id === id);
  const save = useSaveProperty(id);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', address: '', city: '', state: '', pincode: '', description: '' },
  });
  useEffect(() => {
    if (existing) reset({ name: existing.name, address: existing.address, city: existing.city, state: existing.state, pincode: existing.pincode, description: existing.description ?? '' });
  }, [existing, reset]);

  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      const saved = await save.mutateAsync({ ...v, description: orUndefined(v.description) });
      if (!id) setCurrentId(saved.id);
      router.back();
    } catch (e) {
      setError(friendlyError(e));
    }
  });

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={<View className="px-4 pb-4 pt-2"><Button label={id ? 'Save Changes' : 'Create Property'} onPress={submit} loading={save.isPending} /></View>}
    >
      <Header title={id ? 'Edit Property' : 'New Property'} />
      <View className="gap-4 pt-2">
        <TextField control={control} name="name" label="Property Name" placeholder="e.g. Sunrise Residency" />
        <TextField control={control} name="address" label="Address" placeholder="Street, area" multiline />
        <TextField control={control} name="city" label="City" placeholder="Pune" />
        <TextField control={control} name="state" label="State" placeholder="Maharashtra" />
        <TextField control={control} name="pincode" label="Pincode" placeholder="411001" keyboardType="number-pad" maxLength={6} />
        <TextField control={control} name="description" label="Description (optional)" placeholder="Anything worth remembering" multiline />
        {error ? <Text tone="danger" variant="secondary">{error}</Text> : null}
      </View>
    </Screen>
  );
}
