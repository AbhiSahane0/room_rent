import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { Card } from './Card';
import { Icon, IconTone } from './Icon';
import { Text } from './Text';

export function StatCard({ value, label, icon, tone = 'primary', onPress }: { value: string; label: string; icon?: LucideIcon; tone?: IconTone; onPress?: () => void }) {
  return (
    <Card onPress={onPress} className="flex-1 gap-2">
      {icon ? <View className="h-9 w-9 items-center justify-center rounded-md bg-primary-soft"><Icon icon={icon} tone={tone} /></View> : null}
      <Text variant="display">{value}</Text>
      <Text variant="secondary" tone="soft">{label}</Text>
    </Card>
  );
}
