import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api, friendlyError } from '@/api/client';
import { Button, Input, Notice } from '@/components/ui';
import { Page } from '@/components/layout/Page';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    username: z.string().trim().refine((v) => v === '' || /^[a-zA-Z0-9._-]{3,32}$/.test(v), 'Use 3 to 32 letters, numbers, dot, dash or underscore'),
    newPassword: z.string().refine((v) => v === '' || v.length >= 8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
type Form = z.infer<typeof schema>;

export function SecurityPage() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<{ id: string; username: string }>('/auth/me') });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { currentPassword: '', username: '', newPassword: '', confirmPassword: '' } });

  const submit = handleSubmit(async (v) => {
    setError(null); setDone(null);
    if (!v.username && !v.newPassword) return setError('Enter a new username or a new password.');
    try {
      await api.patch('/auth/credentials', { currentPassword: v.currentPassword, ...(v.username ? { username: v.username } : {}), ...(v.newPassword ? { newPassword: v.newPassword } : {}) });
      setDone(v.newPassword ? 'Password updated. Other devices have been signed out.' : 'Username updated.');
      reset();
      void qc.invalidateQueries({ queryKey: ['me'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (e) { setError(friendlyError(e)); }
  });

  return (
    <Page title="Profile & Security" subtitle={me.data ? `Signed in as ${me.data.username}` : undefined} back>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-ink-soft">Leave a field empty to keep it unchanged.</p>
        <Input label="New Username" placeholder={me.data?.username} autoCapitalize="none" autoCorrect="off" autoComplete="username" error={errors.username?.message} {...register('username')} />
        <Input label="New Password" type="password" autoComplete="new-password" placeholder="At least 8 characters" error={errors.newPassword?.message} {...register('newPassword')} />
        <Input label="Confirm New Password" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        <Input label="Current Password" type="password" autoComplete="current-password" placeholder="Required to make changes" error={errors.currentPassword?.message} {...register('currentPassword')} />
        {error ? <Notice tone="danger">{error}</Notice> : null}
        {done ? <Notice tone="success">{done}</Notice> : null}
        <Button type="submit" loading={isSubmitting}>Update</Button>
      </form>
    </Page>
  );
}
