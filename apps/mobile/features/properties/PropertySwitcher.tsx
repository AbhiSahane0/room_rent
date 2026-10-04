import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon, Sheet, Text } from '@/components/ui';
import { useProperty } from './PropertyProvider';

/** Shows the active property. With a single property it is plain text; with several it opens a picker. */
export function PropertySwitcher() {
  const { properties, current, setCurrentId } = useProperty();
  const [open, setOpen] = useState(false);
  if (!current) return null;
  if (properties.length < 2) return <Text tone="soft" variant="bodyMedium">{current.name}</Text>;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Switch property" className="flex-row items-center gap-1 self-start py-1">
        <Text tone="soft" variant="bodyMedium">{current.name}</Text>
        <Icon icon={ChevronDown} size="sm" tone="soft" />
      </Pressable>
      <Sheet visible={open} title="Switch property" onClose={() => setOpen(false)}>
        {properties.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            onPress={() => { setCurrentId(p.id); setOpen(false); }}
            className="min-h-14 flex-row items-center justify-between border-b border-line"
          >
            <View className="flex-1 pr-3">
              <Text variant="bodyMedium">{p.name}</Text>
              <Text variant="secondary" tone="soft">{p.city}, {p.state}</Text>
            </View>
            {p.id === current.id ? <Icon icon={Check} tone="primary" /> : null}
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}
