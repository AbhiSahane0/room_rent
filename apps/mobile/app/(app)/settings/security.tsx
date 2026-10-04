import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import { api, friendlyError } from '@/api/client';
import { Button, Header, Icon, Input, Screen, Text } from '@/components/ui';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    username: z.string().trim().refine((v) => v === '' || /^[a-zA-Z0-9._-]{3,32}$/.test(v), 'Use 3 to 32 letters, numbers, dot, dash or underscore'),
    newPassword: z.string().refine((v) => v === '' || v.length >= 8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export default function SecurityScreen() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<{ id: string; username: string }>('/auth/me') });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState } = useForm({ resolver: zodResolver(schema), defaultValues: { currentPassword: '', username: '', newPassword: '', confirmPassword: '' } });

  const submit = handleSubmit(async (v) => {
    setError(null); setDone(null);
    if (!v.username && !v.newPassword) return setError('Enter a new username or a new password.');
    try {
      await api.patch('/auth/credentials', { currentPassword: v.currentPassword, ...(v.username ? { username: v.username } : {}), ...(v.newPassword ? { newPassword: v.newPassword } : {}) });
      setDone(v.newPassword ? 'Password updated. Other devices have been signed out.' : 'Username updated.');
      reset();
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (e) {
      setError(friendlyError(e));
    }
  });

  return (
    <Screen edges={['top', 'bottom']} footer={<View className="px-4 pb-4 pt-2"><Button label="Update" onPress={submit} loading={formState.isSubmitting} /></View>}>
      <Header title="Profile & Security" subtitle={me.data ? `Signed in as ${me.data.username}` : undefined} />
      <View className="gap-4 pt-2">
        <Text tone="soft">Leave a field empty to keep it unchanged. Your password is never stored on this phone.</Text>
        <Controller control={control} name="username" render={({ field, fieldState }) => <Input label="New Username" placeholder={me.data?.username} autoCapitalize="none" autoCorrect={false} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />} />
        <Controller control={control} name="newPassword" render={({ field, fieldState }) => <Input label="New Password" secure placeholder="At least 8 characters" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />} />
        <Controller control={control} name="confirmPassword" render={({ field, fieldState }) => <Input label="Confirm New Password" secure value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />} />
        <Controller control={control} name="currentPassword" render={({ field, fieldState }) => <Input label="Current Password" secure placeholder="Required to make changes" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />} />
        {error ? <View className="rounded-md bg-danger-soft p-3"><Text variant="secondary" tone="danger">{error}</Text></View> : null}
        {done ? <View className="flex-row items-center gap-2 rounded-md bg-success-soft p-3"><Icon icon={CircleCheck} tone="success" /><Text variant="secondary" tone="success" className="flex-1">{done}</Text></View> : null}
      </View>
    </Screen>
  );
}
