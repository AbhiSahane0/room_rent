import type { LucideIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { Icon } from './Icon';

export function Fab({ icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="absolute bottom-5 right-4 h-14 w-14 items-center justify-center rounded-full bg-primary active:bg-primary-dark"
      style={{ elevation: 4, shadowColor: '#0F172A', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}
    >
      <Icon icon={icon} size="lg" tone="white" />
    </Pressable>
  );
}
