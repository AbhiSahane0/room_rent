import type { LucideIcon } from 'lucide-react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';
import { cn } from '@/utils/cn';
import { colors } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  secure?: boolean;
  prefix?: string;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, hint, icon, secure, prefix, containerClassName, editable = true, multiline, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label ? <Text variant="label" tone="soft">{label}</Text> : null}
      <View
        className={cn(
          'flex-row items-center rounded-md border bg-surface px-3',
          multiline ? 'min-h-24 items-start py-3' : 'h-12',
          focused ? 'border-primary' : error ? 'border-danger' : 'border-line-strong',
          !editable && 'bg-surface-muted',
        )}
      >
        {icon ? (
          <View className="mr-2">
            <Icon icon={icon} tone={focused ? 'primary' : 'muted'} />
          </View>
        ) : null}
        {prefix ? <Text tone="soft" className="mr-1">{prefix}</Text> : null}
        <TextInput
          ref={ref}
          editable={editable}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          placeholderTextColor={colors.ink.muted}
          secureTextEntry={hidden}
          autoCapitalize={secure ? 'none' : props.autoCapitalize}
          autoCorrect={secure ? false : props.autoCorrect}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.ink.DEFAULT, flex: 1, paddingVertical: 0, outlineStyle: 'none' } as any}
          {...props}
        />
        {secure ? (
          <Pressable hitSlop={12} onPress={() => setHidden((h) => !h)} accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Icon icon={hidden ? Eye : EyeOff} tone="muted" />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text variant="secondary" tone="danger">{error}</Text> : hint ? <Text variant="secondary" tone="muted">{hint}</Text> : null}
    </View>
  );
});
