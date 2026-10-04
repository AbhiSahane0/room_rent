import { Pressable, View, ViewProps } from 'react-native';
import { cn } from '@/utils/cn';

interface Props extends ViewProps {
  onPress?: () => void;
  className?: string;
  padded?: boolean;
}

export function Card({ onPress, className, padded = true, children, ...props }: Props) {
  const base = cn('bg-surface rounded-lg border border-line', padded && 'p-4', className);
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} className={cn(base, 'active:bg-surface-muted')} {...(props as any)}>
        {children}
      </Pressable>
    );
  }
  return (
    <View className={base} {...props}>
      {children}
    </View>
  );
}
