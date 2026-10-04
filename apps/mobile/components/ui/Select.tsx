import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { cn } from '@/utils/cn';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { Text } from './Text';

export interface Option<T extends string> { value: T; label: string; hint?: string }

interface Props<T extends string> {
  label?: string;
  placeholder?: string;
  value?: T | null;
  options: Option<T>[];
  onChange: (v: T) => void;
  error?: string;
  disabled?: boolean;
}

export function Select<T extends string>({ label, placeholder = 'Select', value, options, onChange, error, disabled }: Props<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View className="gap-1.5">
      {label ? <Text variant="label" tone="soft">{label}</Text> : null}
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        className={cn('h-12 flex-row items-center rounded-md border bg-surface px-3', error ? 'border-danger' : 'border-line-strong', disabled && 'bg-surface-muted')}
      >
        <Text className="flex-1" tone={current ? 'ink' : 'muted'} numberOfLines={1}>{current?.label ?? placeholder}</Text>
        <Icon icon={ChevronDown} tone="muted" />
      </Pressable>
      {error ? <Text variant="secondary" tone="danger">{error}</Text> : null}
      <Sheet visible={open} title={label ?? placeholder} onClose={() => setOpen(false)}>
        {options.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => { onChange(o.value); setOpen(false); }}
            className="min-h-14 flex-row items-center justify-between border-b border-line"
            accessibilityRole="button"
          >
            <View className="flex-1 pr-3">
              <Text variant="bodyMedium">{o.label}</Text>
              {o.hint ? <Text variant="secondary" tone="soft">{o.hint}</Text> : null}
            </View>
            {o.value === value ? <Icon icon={Check} tone="primary" /> : null}
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}
