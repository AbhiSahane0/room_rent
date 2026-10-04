import { Banknote, ChartColumn, ChevronRight, CircleHelp, MapPin, LogOut, Settings } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Card, ConfirmDialog, Icon, Screen, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';

function Row({ icon, label, onPress, danger, last }: { icon: LucideIcon; label: string; onPress: () => void; danger?: boolean; last?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className={`min-h-14 flex-row items-center px-4 active:bg-surface-muted ${last ? '' : 'border-b border-line'}`}>
      <View className={`mr-3 h-9 w-9 items-center justify-center rounded-md ${danger ? 'bg-danger-soft' : 'bg-primary-soft'}`}>
        <Icon icon={icon} tone={danger ? 'danger' : 'primary'} />
      </View>
      <Text variant="bodyMedium" tone={danger ? 'danger' : 'ink'} className="flex-1">{label}</Text>
      {!danger ? <Icon icon={ChevronRight} tone="muted" /> : null}
    </Pressable>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const doLogout = async () => {
    setBusy(true);
    await logout();
  };

  return (
    <Screen>
      <Text variant="title" className="pb-4 pt-4">More</Text>
      <Card padded={false}>
        <Row icon={Banknote} label="Payments" onPress={() => router.push('/payments')} />
        <Row icon={ChartColumn} label="Reports" onPress={() => router.push('/reports')} />
        <Row icon={MapPin} label="Properties" onPress={() => router.push('/properties')} />
        <Row icon={Settings} label="Settings" onPress={() => router.push('/settings')} />
        <Row icon={CircleHelp} label="Help" onPress={() => router.push('/help')} last />
      </Card>
      <Card padded={false} className="mt-4">
        <Row icon={LogOut} label="Logout" onPress={() => setConfirming(true)} danger last />
      </Card>
      <ConfirmDialog
        visible={confirming}
        title="Log out?"
        message="You will need to sign in again to use the app."
        confirmLabel="Log out"
        destructive
        loading={busy}
        onConfirm={doLogout}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}
