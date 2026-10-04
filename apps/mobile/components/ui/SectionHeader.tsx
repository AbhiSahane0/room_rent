import { Pressable, View } from 'react-native';
import { Text } from './Text';

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View className="mb-3 mt-6 flex-row items-center justify-between">
      <Text variant="heading">{title}</Text>
      {actionLabel ? (
        <Pressable hitSlop={10} onPress={onAction} accessibilityRole="button">
          <Text variant="secondaryMedium" tone="primary">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
