import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, PressableProps, View } from 'react-native';
import { cn } from '@/utils/cn';
import { colors } from '@/theme';
import { Icon, IconTone } from './Icon';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

const container: Record<Variant, string> = {
  primary: 'bg-primary active:bg-primary-dark',
  secondary: 'bg-surface border border-line-strong active:bg-surface-muted',
  ghost: 'bg-transparent active:bg-surface-muted',
  danger: 'bg-danger-soft active:opacity-80',
};
const labelTone: Record<Variant, 'white' | 'ink' | 'primary' | 'danger'> = {
  primary: 'white',
  secondary: 'ink',
  ghost: 'primary',
  danger: 'danger',
};
const iconTone: Record<Variant, IconTone> = { primary: 'white', secondary: 'ink', ghost: 'primary', danger: 'danger' };

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function Button({ label, variant = 'primary', size = 'md', icon, loading, disabled, fullWidth = true, className, ...props }: Props) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      className={cn(
        'flex-row items-center justify-center rounded-md px-4',
        size === 'md' ? 'h-12' : 'h-9 px-3',
        fullWidth ? 'w-full' : 'self-start',
        off && variant === 'primary' ? 'bg-disabled' : container[variant],
        off && variant !== 'primary' && 'opacity-60',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : colors.primary.DEFAULT} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon ? <Icon icon={icon} size={size === 'md' ? 'md' : 'sm'} tone={off && variant === 'primary' ? 'muted' : iconTone[variant]} /> : null}
          <Text variant={size === 'md' ? 'bodyMedium' : 'secondaryMedium'} className="font-semibold" tone={off && variant === 'primary' ? 'muted' : labelTone[variant]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
