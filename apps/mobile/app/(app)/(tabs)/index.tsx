import { useRouter } from 'expo-router';
import { Building2, Plus } from 'lucide-react-native';
import { View } from 'react-native';
import { EmptyState, ErrorState, Screen, SkeletonList, Text } from '@/components/ui';
import { useAuthName } from '@/features/dashboard';
import { PropertySwitcher } from '@/features/properties/PropertySwitcher';
import { useProperty } from '@/features/properties/PropertyProvider';
import { greeting } from '@/utils/format';

export default function HomeScreen() {
  const router = useRouter();
  const name = useAuthName();
  const { current, isLoading, isError, error, refetch } = useProperty();

  return (
    <Screen refreshing={false} onRefresh={refetch}>
      <View className="pb-2 pt-4">
        <Text variant="title">{greeting()}, {name}</Text>
        <PropertySwitcher />
      </View>

      {isLoading ? (
        <View className="mt-4"><SkeletonList count={2} /></View>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !current ? (
        <EmptyState icon={Building2} title="Add your first property" message="Create a property to start adding rooms, tenants and bills." actionLabel="Add Property" actionIcon={Plus} onAction={() => router.push('/properties/form')} />
      ) : null}
    </Screen>
  );
}
