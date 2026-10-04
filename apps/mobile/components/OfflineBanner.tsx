import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, Text } from '@/components/ui';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => NetInfo.addEventListener((s) => setOffline(s.isConnected === false || s.isInternetReachable === false)), []);
  if (!offline) return null;
  return (
    <SafeAreaView edges={['top']} className="bg-ink-soft" pointerEvents="none">
      <View className="flex-row items-center justify-center gap-2 py-1.5">
        <Icon icon={WifiOff} size="sm" tone="white" />
        <Text variant="caption" tone="white">No internet connection</Text>
      </View>
    </SafeAreaView>
  );
}
