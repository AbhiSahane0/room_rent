import { Pressable, View } from 'react-native';
import { cn } from '@/utils/cn';
import { Text } from './Text';

export function SegmentedControl<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View className="flex-row rounded-md bg-surface-muted p-1">
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: o.value === value }}
          className={cn('h-10 flex-1 items-center justify-center rounded-sm', o.value === value && 'bg-surface')}
        >
          <Text variant="secondaryMedium" tone={o.value === value ? 'ink' : 'soft'} className={o.value === value ? 'font-semibold' : ''}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
