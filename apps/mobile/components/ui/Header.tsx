import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';

interface Props {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
  hideBack?: boolean;
}

export function Header({ title, subtitle, right, onBack, hideBack }: Props) {
  const router = useRouter();
  return (
    <View className="min-h-14 flex-row items-center gap-1 pb-2 pt-2">
      {hideBack ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
          className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-surface-muted"
        >
          <Icon icon={ArrowLeft} size="lg" tone="ink" />
        </Pressable>
      )}
      <View className="flex-1">
        <Text variant="heading" numberOfLines={1}>{title}</Text>
        {subtitle ? <Text variant="secondary" tone="soft" numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}
