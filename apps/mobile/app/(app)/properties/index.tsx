import { useRouter } from 'expo-router';
import { Building2, Check, ChevronRight, Plus } from 'lucide-react-native';
import { View } from 'react-native';
import { Badge, Button, Card, EmptyState, ErrorState, Header, Icon, Screen, SkeletonList, Text } from '@/components/ui';
import { useProperty } from '@/features/properties/PropertyProvider';

export default function PropertiesScreen() {
  const router = useRouter();
  const { properties, current, setCurrentId, isLoading, isError, error, refetch } = useProperty();
  return (
    <Screen
      footer={properties.length ? (
        <View className="px-4 pb-4 pt-2"><Button label="Add Property" icon={Plus} onPress={() => router.push('/properties/form')} /></View>
      ) : undefined}
      edges={['top', 'bottom']}
    >
      <Header title="Properties" />
      {isLoading ? (
        <SkeletonList count={2} lines={3} />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : properties.length === 0 ? (
        <EmptyState icon={Building2} title="No properties yet" message="Add a property to start managing rooms, tenants and rent." actionLabel="Add Property" actionIcon={Plus} onAction={() => router.push('/properties/form')} />
      ) : (
        <View className="gap-3 pt-2">
          {properties.map((p) => (
            <Card key={p.id} onPress={() => router.push({ pathname: '/properties/form', params: { id: p.id } })} className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text variant="heading" className="flex-1 pr-2">{p.name}</Text>
                <Icon icon={ChevronRight} tone="muted" />
              </View>
              <Text tone="soft">{p.city}, {p.state}</Text>
              <View className="mt-1 flex-row items-center justify-between">
                <Text variant="secondary" tone="soft">{p.occupiedCount ?? 0} of {p.roomCount ?? 0} rooms occupied</Text>
                {p.id === current?.id ? (
                  <Badge label="Active" tone="primary" />
                ) : (
                  <Button label="Switch to this" variant="ghost" size="sm" fullWidth={false} icon={Check} onPress={() => setCurrentId(p.id)} />
                )}
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
