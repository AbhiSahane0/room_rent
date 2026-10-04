import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

interface Props {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionLabel, actionIcon, onAction }: Props) {
  return (
    <View className="items-center px-6 py-12">
      <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
        <Icon icon={icon} size={32} tone="primary" />
      </View>
      <Text variant="heading" className="text-center">{title}</Text>
      <Text tone="soft" className="mt-1.5 mb-6 text-center">{message}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} icon={actionIcon} onPress={onAction} fullWidth={false} className="px-6" /> : null}
    </View>
  );
}
