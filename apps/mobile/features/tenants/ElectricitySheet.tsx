import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { friendlyError } from '@/api/client';
import { Button, Icon, Input, SegmentedControl, Sheet, Text } from '@/components/ui';
import { formatINR } from '@/utils/format';
import { Check } from 'lucide-react-native';
import { useChangeElectricity } from './api';

type Mode = 'METER' | 'FIXED' | 'NONE';

/** Sets how this tenant's electricity is billed from now on. Bills already generated are never changed. */
export function ElectricitySheet({ visible, onClose, assignmentId, mode: initialMode, ratePerUnit, fixedElectricity }: { visible: boolean; onClose: () => void; assignmentId: string; mode: Mode; ratePerUnit: number | null; fixedElectricity: number | null }) {
  const change = useChangeElectricity(assignmentId);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [rate, setRate] = useState(ratePerUnit != null ? String(ratePerUnit) : '');
  const [fixed, setFixed] = useState(fixedElectricity != null ? String(fixedElectricity) : '');
  const [room, setRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (mode === 'METER' && !(rate !== '' && Number(rate) >= 0)) return setError('Enter the rate per unit');
    if (mode === 'FIXED' && !(fixed !== '' && Number(fixed) >= 0)) return setError('Enter the fixed monthly amount');
    const body = mode === 'METER' ? { electricityMode: mode, ratePerUnit: Number(rate) } : mode === 'FIXED' ? { electricityMode: mode, fixedElectricity: Number(fixed) } : { electricityMode: mode };
    try {
      await change.mutateAsync({ ...body, applyToRoom: room });
      onClose();
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  return (
    <Sheet visible={visible} title="Electricity billing" onClose={onClose}>
      <View className="gap-4 pb-4">
        <Text tone="soft">{initialMode === 'METER' ? `Currently ${formatINR(ratePerUnit)} per unit.` : initialMode === 'FIXED' ? `Currently a fixed ${formatINR(fixedElectricity)} a month.` : 'Currently not charged.'} Applies to bills generated from now on.</Text>
        <SegmentedControl value={mode} onChange={setMode} options={[{ value: 'METER', label: 'Per unit' }, { value: 'FIXED', label: 'Fixed' }, { value: 'NONE', label: 'None' }]} />
        {mode === 'METER' ? <Input label="Rate per unit" prefix="₹" keyboardType="decimal-pad" value={rate} onChangeText={setRate} /> : null}
        {mode === 'FIXED' ? <Input label="Fixed monthly amount" prefix="₹" keyboardType="decimal-pad" value={fixed} onChangeText={setFixed} /> : null}
        <Pressable onPress={() => setRoom((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: room }} className="flex-row items-center gap-3">
          <View className={`h-6 w-6 items-center justify-center rounded border ${room ? 'border-primary bg-primary' : 'border-line-strong bg-surface'}`}>{room ? <Icon icon={Check} size="sm" tone="white" /> : null}</View>
          <Text tone="soft" className="flex-1">Also make this the room&apos;s default for the next tenant</Text>
        </Pressable>
        {error ? <Text tone="danger" variant="secondary">{error}</Text> : null}
        <Button label="Save" onPress={save} loading={change.isPending} />
      </View>
    </Sheet>
  );
}
