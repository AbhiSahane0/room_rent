import { Building2, House, Menu, Receipt, Users } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Icon } from '@/components/ui';
import { useLayout } from '@/hooks/useLayout';
import { colors, fonts } from '@/theme';

function tabIcon(glyph: LucideIcon) {
  const TabIcon = ({ focused }: { focused: boolean }) => (
    <View className={`h-8 w-14 items-center justify-center rounded-full ${focused ? 'bg-primary-soft' : ''}`}>
      <Icon icon={glyph} tone={focused ? 'primary' : 'muted'} />
    </View>
  );
  return TabIcon;
}

export default function TabsLayout() {
  const { isDesktop } = useLayout();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.ink.muted,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        // Laptops use the sidebar instead of bottom tabs.
        tabBarStyle: isDesktop ? { display: 'none' } : { backgroundColor: colors.surface.DEFAULT, borderTopColor: colors.line.DEFAULT, height: 64, paddingTop: 6, paddingBottom: 6 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon(House) }} />
      <Tabs.Screen name="rooms" options={{ title: 'Rooms', tabBarIcon: tabIcon(Building2) }} />
      <Tabs.Screen name="tenants" options={{ title: 'Tenants', tabBarIcon: tabIcon(Users) }} />
      <Tabs.Screen name="bills" options={{ title: 'Bills', tabBarIcon: tabIcon(Receipt) }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: tabIcon(Menu) }} />
    </Tabs>
  );
}
