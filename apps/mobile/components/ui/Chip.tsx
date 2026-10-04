import { Pressable } from 'react-native';
import { cn } from '@/utils/cn';
import { Text } from './Text';

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      className={cn('h-9 items-center justify-center rounded-full border px-3.5', selected ? 'border-primary bg-primary' : 'border-line-strong bg-surface')}
    >
      <Text variant="secondaryMedium" tone={selected ? 'white' : 'soft'}>{label}</Text>
    </Pressable>
  );
}
