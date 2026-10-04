import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Platform, Pressable, TextInput, View } from 'react-native';
import { cn } from '@/utils/cn';
import { formatDate, toISODate } from '@/utils/format';
import { colors } from '@/theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

interface Props {
  label?: string;
  /** YYYY-MM-DD */
  value?: string;
  onChange: (iso: string) => void;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
}

const parse = (iso?: string) => {
  if (!iso) return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Native date picker: Android dialog, iOS sheet. Browser preview falls back to a typed YYYY-MM-DD field. */
export function DateField({ label, value, onChange, error, minimumDate, maximumDate, disabled }: Props) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(parse(value));

  const open = () => {
    if (disabled) return;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: parse(value), mode: 'date', minimumDate, maximumDate,
        onChange: (e, date) => { if (e.type === 'set' && date) onChange(toISODate(date)); },
      });
    } else {
      setDraft(parse(value));
      setIosOpen(true);
    }
  };

  return (
    <View className="gap-1.5">
      {label ? <Text variant="label" tone="soft">{label}</Text> : null}
      {Platform.OS === 'web' ? (
        <TextInput
          value={value ?? ''}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.ink.muted}
          style={{ fontFamily: 'Inter_400Regular', fontSize: 15, height: 48, borderWidth: 1, borderColor: error ? colors.danger.DEFAULT : colors.line.strong, borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fff' }}
        />
      ) : (
        <Pressable
          onPress={open}
          accessibilityRole="button"
          className={cn('h-12 flex-row items-center rounded-md border bg-surface px-3', error ? 'border-danger' : 'border-line-strong', disabled && 'bg-surface-muted')}
        >
          <Text className="flex-1" tone={value ? 'ink' : 'muted'}>{value ? formatDate(value) : 'Select date'}</Text>
          <Icon icon={Calendar} tone="muted" />
        </Pressable>
      )}
      {error ? <Text variant="secondary" tone="danger">{error}</Text> : null}
      {Platform.OS === 'ios' ? (
        <Modal transparent visible={iosOpen} animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <View className="flex-1 justify-end bg-black/40">
            <View className="rounded-t-xl bg-surface p-4">
              <DateTimePicker value={draft} mode="date" display="spinner" minimumDate={minimumDate} maximumDate={maximumDate} onChange={(_, d) => d && setDraft(d)} />
              <Button label="Done" onPress={() => { onChange(toISODate(draft)); setIosOpen(false); }} />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
