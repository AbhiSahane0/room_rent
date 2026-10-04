import { View } from 'react-native';
import { cn } from '@/utils/cn';
import { Text } from './Text';

export function DetailRow({ label, value, strong, tone, last }: { label: string; value: string; strong?: boolean; tone?: 'danger' | 'success' | 'ink'; last?: boolean }) {
  return (
    <View className={cn('min-h-11 flex-row items-center justify-between gap-4 py-2.5', !last && 'border-b border-line')}>
      <Text tone="soft" variant="secondary">{label}</Text>
      <Text variant={strong ? 'heading' : 'bodyMedium'} tone={tone ?? 'ink'} className="flex-shrink text-right">{value}</Text>
    </View>
  );
}
