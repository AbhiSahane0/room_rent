import { Building2, ChevronDown } from 'lucide-react-native';
import { View } from 'react-native';
import { EmptyState, ErrorState, Icon, Screen, Skeleton, SkeletonList, Text } from '@/components/ui';
import { useDashboard } from '@/features/dashboard';
import { greeting } from '@/utils/format';

export default function HomeScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useDashboard();

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <View className="pb-2 pt-4">
        <Text variant="title">{greeting()}, {data?.username ? capitalise(data.username) : 'Owner'}</Text>
        {data?.properties[0] ? (
          <View className="mt-1.5 flex-row items-center gap-1">
            <Text tone="soft" variant="bodyMedium">{data.properties[0].name}</Text>
            <Icon icon={ChevronDown} size="sm" tone="soft" />
          </View>
        ) : isLoading ? (
          <Skeleton width={160} height={16} className="mt-2" />
        ) : null}
      </View>

      {isLoading ? (
        <View className="mt-4"><SkeletonList count={2} /></View>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data && data.properties.length === 0 ? (
        <EmptyState icon={Building2} title="Add your first property" message="Create a property to start adding rooms, tenants and bills." />
      ) : null}
    </Screen>
  );
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
