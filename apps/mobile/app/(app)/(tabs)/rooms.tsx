import { Building2 } from 'lucide-react-native';
import { EmptyState, Screen, Text } from '@/components/ui';

export default function RoomsScreen() {
  return (
    <Screen>
      <Text variant="title" className="pb-2 pt-4">Rooms</Text>
      <EmptyState icon={Building2} title="No rooms yet" message="Rooms you add will appear here." />
    </Screen>
  );
}
