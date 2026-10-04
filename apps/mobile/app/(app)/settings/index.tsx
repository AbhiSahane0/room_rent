import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Building2, ChevronRight, Info, LogOut, ReceiptText, ShieldCheck } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Card, ConfirmDialog, Header, Icon, Screen, SectionHeader, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useProperty } from '@/features/properties/PropertyProvider';
import { Avatar } from '@/features/tenants/TenantCard';

function Row({ icon, label, hint, onPress, last }: { icon: LucideIcon; label: string; hint?: string; onPress?: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} className={`min-h-14 flex-row items-center px-4 py-2 ${onPress ? 'active:bg-surface-muted' : ''} ${last ? '' : 'border-b border-line'}`}>
      <View className="mr-3 h-9 w-9 items-center justify-center rounded-md bg-primary-soft"><Icon icon={icon} tone="primary" /></View>
      <View className="flex-1">
        <Text variant="bodyMedium">{label}</Text>
        {hint ? <Text variant="secondary" tone="soft" numberOfLines={1}>{hint}</Text> : null}
      </View>
      {onPress ? <Icon icon={ChevronRight} tone="muted" /> : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { current } = useProperty();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<{ id: string; username: string }>('/auth/me') });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Settings" />
      <Card className="mt-1 flex-row items-center gap-3">
        <Avatar name={me.data?.username ?? 'Owner'} size={52} />
        <View className="flex-1">
          <Text variant="heading">{me.data?.username ?? ' '}</Text>
          <Text variant="secondary" tone="soft">Owner account</Text>
        </View>
      </Card>

      <SectionHeader title="Account" />
      <Card padded={false}>
        <Row icon={ShieldCheck} label="Profile & Security" hint="Change your username or password" onPress={() => router.push('/settings/security')} last />
      </Card>

      <SectionHeader title="Property" />
      <Card padded={false}>
        <Row icon={Building2} label="Property Settings" hint={current ? `${current.name}, ${current.city}` : 'Add a property first'} onPress={current ? () => router.push({ pathname: '/properties/form', params: { id: current.id } }) : () => router.push('/properties/form')} />
        <Row icon={ReceiptText} label="Bill Settings" hint={current ? `Prefix ${current.billPrefix}, due on day ${current.dueDayOfMonth}` : 'Prefix, due day, electricity rate'} onPress={current ? () => router.push('/settings/bill') : undefined} last />
      </Card>

      <SectionHeader title="App" />
      <Card padded={false}>
        <Row icon={Info} label="About" hint={`Rent Manager · Version ${version}`} />
      </Card>

      <Card padded={false} className="mt-6">
        <Pressable onPress={() => setConfirming(true)} accessibilityRole="button" className="min-h-14 flex-row items-center px-4 active:bg-surface-muted">
          <View className="mr-3 h-9 w-9 items-center justify-center rounded-md bg-danger-soft"><Icon icon={LogOut} tone="danger" /></View>
          <Text variant="bodyMedium" tone="danger">Logout</Text>
        </Pressable>
      </Card>

      <ConfirmDialog visible={confirming} title="Log out?" message="You will need to sign in again to use the app." confirmLabel="Log out" destructive loading={busy} onConfirm={async () => { setBusy(true); await logout(); }} onCancel={() => setConfirming(false)} />
    </Screen>
  );
}
