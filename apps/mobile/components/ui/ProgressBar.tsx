import { View } from 'react-native';

export function ProgressBar({ value, tint = 'bg-white', track = 'bg-white/25' }: { value: number; tint?: string; track?: string }) {
  const pct = Math.max(0, Math.min(1, value || 0)) * 100;
  return (
    <View className={`h-2 overflow-hidden rounded-full ${track}`}>
      <View className={`h-2 rounded-full ${tint}`} style={{ width: `${pct}%` }} />
    </View>
  );
}
