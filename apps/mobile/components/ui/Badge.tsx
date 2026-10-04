import { View } from 'react-native';
import { cn } from '@/utils/cn';
import { Text } from './Text';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'primary';
const bg: Record<BadgeTone, string> = {
  success: 'bg-success-soft',
  warning: 'bg-warning-soft',
  danger: 'bg-danger-soft',
  neutral: 'bg-surface-muted',
  primary: 'bg-primary-soft',
};
const dot: Record<BadgeTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-ink-muted',
  primary: 'bg-primary',
};
const text: Record<BadgeTone, 'success' | 'warning' | 'danger' | 'soft' | 'primary'> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  neutral: 'soft',
  primary: 'primary',
};

export function Badge({ label, tone = 'neutral', withDot = true }: { label: string; tone?: BadgeTone; withDot?: boolean }) {
  return (
    <View className={cn('flex-row items-center self-start rounded-full px-2.5 py-1', bg[tone])}>
      {withDot ? <View className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', dot[tone])} /> : null}
      <Text variant="caption" tone={text[tone]} className="font-semibold">{label}</Text>
    </View>
  );
}
