import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { formatYM, shiftMonth } from '@/utils/format';
import { Icon } from './Icon';
import { Text } from './Text';

export function MonthStepper({ value, onChange, label }: { value: string; onChange: (ym: string) => void; label?: string }) {
  return (
    <View className="gap-1.5">
      {label ? <Text variant="label" tone="soft">{label}</Text> : null}
      <View className="h-12 flex-row items-center justify-between rounded-md border border-line-strong bg-surface px-1">
        <Pressable onPress={() => onChange(shiftMonth(value, -1))} accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={6} className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-muted"><Icon icon={ChevronLeft} tone="ink" /></Pressable>
        <Text variant="bodyMedium">{formatYM(value)}</Text>
        <Pressable onPress={() => onChange(shiftMonth(value, 1))} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={6} className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-muted"><Icon icon={ChevronRight} tone="ink" /></Pressable>
      </View>
    </View>
  );
}
