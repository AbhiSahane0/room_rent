import { Stack } from 'expo-router';
import { PropertyProvider } from '@/features/properties/PropertyProvider';

export default function AppLayout() {
  return (
    <PropertyProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </PropertyProvider>
  );
}
