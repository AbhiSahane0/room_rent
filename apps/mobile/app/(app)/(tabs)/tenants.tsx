import { Users } from 'lucide-react-native';
import { EmptyState, Screen, Text } from '@/components/ui';

export default function TenantsScreen() {
  return (
    <Screen>
      <Text variant="title" className="pb-2 pt-4">Tenants</Text>
      <EmptyState icon={Users} title="No tenants yet" message="Add your first tenant to start managing rent and bills." />
    </Screen>
  );
}
