import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Lock, User } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import { ApiError, friendlyError } from '@/api/client';
import { Button, Icon, Input, Notice } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';

const schema = z.object({ username: z.string().trim().min(1, 'Enter your username'), password: z.string().min(1, 'Enter your password') });

export function LoginPage() {
  const { status, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(schema), defaultValues: { username: '', password: '' } });
  const [show, setShow] = useState(false);
  if (status === 'authenticated') return <Navigate to="/" replace />;

  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      await login(v.username, v.password);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? 'Incorrect username or password.' : friendlyError(e));
    }
  });

  return (
    <div className="pt-safe flex min-h-full items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-sm" noValidate>
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-primary"><Icon icon={Building2} size={30} tone="white" /></div>
          <h1 className="text-title">Welcome Back</h1>
          <p className="mt-1 text-ink-soft">Sign in to manage your properties</p>
        </div>
        <div className="space-y-4">
          <Input label="Username" icon={User} placeholder="Enter username" autoComplete="username" autoCapitalize="none" autoCorrect="off" error={formState.errors.username?.message} {...register('username')} />
          <div className="relative">
            <Input label="Password" icon={Lock} type={show ? 'text' : 'password'} placeholder="Enter password" autoComplete="current-password" error={formState.errors.password?.message} {...register('password')} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-[34px] text-small font-medium text-primary" aria-label={show ? 'Hide password' : 'Show password'}>{show ? 'Hide' : 'Show'}</button>
          </div>
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <Button type="submit" loading={formState.isSubmitting} className="mt-2">Login</Button>
        </div>
      </form>
    </div>
  );
}
