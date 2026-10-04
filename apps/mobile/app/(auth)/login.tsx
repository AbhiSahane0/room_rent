import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Lock, User } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { TextInput, View } from 'react-native';
import { z } from 'zod';
import { ApiError, friendlyError } from '@/api/client';
import { Button, Icon, Input, Screen, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';

const schema = z.object({
  username: z.string().trim().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
});
type Form = z.infer<typeof schema>;

export default function LoginScreen() {
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.username, values.password);
    } catch (e) {
      setFormError(e instanceof ApiError && e.status === 401 ? 'Incorrect username or password.' : friendlyError(e));
    }
  });

  return (
    <Screen bottomInset={32}>
      <View className="flex-1 justify-center py-10">
        <View className="mb-10 items-center">
          <View className="mb-5 h-16 w-16 items-center justify-center rounded-xl bg-primary">
            <Icon icon={Building2} size={30} tone="white" />
          </View>
          <Text variant="title">Welcome Back</Text>
          <Text tone="soft" className="mt-1">Sign in to manage your properties</Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="username"
            render={({ field, fieldState }) => (
              <Input
                label="Username"
                icon={User}
                placeholder="Enter username"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                autoComplete="username"
                returnKeyType="next"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                onSubmitEditing={() => passwordRef.current?.focus()}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <Input
                ref={passwordRef}
                label="Password"
                icon={Lock}
                secure
                placeholder="Enter password"
                textContentType="password"
                autoComplete="current-password"
                returnKeyType="go"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                onSubmitEditing={submit}
                error={fieldState.error?.message}
              />
            )}
          />
          {formError ? (
            <View className="rounded-md bg-danger-soft px-3 py-2.5">
              <Text variant="secondary" tone="danger">{formError}</Text>
            </View>
          ) : null}
          <Button label="Login" onPress={submit} loading={formState.isSubmitting} className="mt-2" />
        </View>
      </View>
    </Screen>
  );
}
