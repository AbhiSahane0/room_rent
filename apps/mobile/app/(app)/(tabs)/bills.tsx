import { Receipt } from 'lucide-react-native';
import { EmptyState, Screen, Text } from '@/components/ui';

export default function BillsScreen() {
  return (
    <Screen>
      <Text variant="title" className="pb-2 pt-4">Bills</Text>
      <EmptyState icon={Receipt} title="No bills yet" message="Generated bills will appear here." />
    </Screen>
  );
}
