import { usePathname, useRouter } from 'expo-router';
import { Banknote, Building2, ChartColumn, CircleHelp, House, LogOut, MapPin, Receipt, Settings, Users } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ConfirmDialog, Icon, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { PropertySwitcher } from '@/features/properties/PropertySwitcher';
import { cn } from '@/utils/cn';

const NAV: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: '/', label: 'Home', icon: House, exact: true },
  { href: '/rooms', label: 'Rooms', icon: Building2 },
  { href: '/tenants', label: 'Tenants', icon: Users },
  { href: '/bills', label: 'Bills', icon: Receipt },
  { href: '/payments', label: 'Payments', icon: Banknote },
  { href: '/reports', label: 'Reports', icon: ChartColumn },
  { href: '/properties', label: 'Properties', icon: MapPin },
];
const FOOTER_NAV = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/help', label: 'Help', icon: CircleHelp },
];

/** Persistent navigation for laptop-sized browsers. Phones keep the bottom tabs. */
export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = (item: { href: string; exact?: boolean }) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  const Item = ({ item }: { item: { href: string; label: string; icon: LucideIcon; exact?: boolean } }) => {
    const on = active(item);
    return (
      <Pressable onPress={() => router.navigate(item.href as never)} accessibilityRole="link" accessibilityState={{ selected: on }} className={cn('h-11 flex-row items-center gap-3 rounded-md px-3', on ? 'bg-primary-soft' : 'active:bg-surface-muted')}>
        <Icon icon={item.icon} tone={on ? 'primary' : 'soft'} />
        <Text variant="bodyMedium" tone={on ? 'primary' : 'soft'} className={on ? 'font-semibold' : ''}>{item.label}</Text>
      </Pressable>
    );
  };

  return (
    <View className="w-64 border-r border-line bg-surface px-3 py-5">
      <View className="mb-5 flex-row items-center gap-3 px-2">
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary"><Icon icon={Building2} tone="white" /></View>
        <View className="flex-1">
          <Text variant="heading">Rent Manager</Text>
          <PropertySwitcher />
        </View>
      </View>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="gap-1">{NAV.map((n) => <Item key={n.href} item={n} />)}</View>
      </ScrollView>
      <View className="gap-1 border-t border-line pt-3">
        {FOOTER_NAV.map((n) => <Item key={n.href} item={n} />)}
        <Pressable onPress={() => setConfirming(true)} accessibilityRole="button" className="h-11 flex-row items-center gap-3 rounded-md px-3 active:bg-danger-soft">
          <Icon icon={LogOut} tone="danger" /><Text variant="bodyMedium" tone="danger">Logout</Text>
        </Pressable>
      </View>
      <ConfirmDialog visible={confirming} title="Log out?" message="You will need to sign in again to use the app." confirmLabel="Log out" destructive loading={busy} onConfirm={async () => { setBusy(true); await logout(); }} onCancel={() => setConfirming(false)} />
    </View>
  );
}
