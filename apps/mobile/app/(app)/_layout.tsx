import { Stack } from 'expo-router';
import { View } from 'react-native';
import { Sidebar } from '@/components/Sidebar';
import { PropertyProvider } from '@/features/properties/PropertyProvider';
import { useLayout } from '@/hooks/useLayout';

export default function AppLayout() {
  const { isDesktop } = useLayout();
  return (
    <PropertyProvider>
      <View className="flex-1 flex-row bg-bg">
        {isDesktop ? <Sidebar /> : null}
        <View className="flex-1">
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F6F7F9' } }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </View>
      </View>
    </PropertyProvider>
  );
}
