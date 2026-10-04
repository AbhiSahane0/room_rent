import { useRouter } from 'expo-router';
import { Banknote, DoorOpen, Receipt, UserPlus } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Icon, Text } from '@/components/ui';

function Action({ icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className="min-h-24 flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-surface p-3 active:bg-surface-muted">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-soft"><Icon icon={icon} size="lg" tone="primary" /></View>
      <Text variant="secondaryMedium" className="text-center">{label}</Text>
    </Pressable>
  );
}

export function QuickActions() {
  const router = useRouter();
  return (
    <View className="flex-row gap-3">
      <Action icon={UserPlus} label="Add Tenant" onPress={() => router.push('/tenants/new')} />
      <Action icon={Receipt} label="Generate Bill" onPress={() => router.push('/bills/new')} />
      <Action icon={Banknote} label="Record Payment" onPress={() => router.push('/payments/new')} />
      <Action icon={DoorOpen} label="Add Room" onPress={() => router.push('/rooms/form')} />
    </View>
  );
}
