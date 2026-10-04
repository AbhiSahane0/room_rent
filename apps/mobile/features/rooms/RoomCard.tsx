import { ChevronRight, UserPlus } from 'lucide-react-native';
import { View } from 'react-native';
import { Badge, BadgeTone, Button, Card, Icon, Text } from '@/components/ui';
import { formatINR } from '@/utils/format';
import type { Room, RoomStatus } from '@/types/api';

export const ROOM_STATUS: Record<RoomStatus, { label: string; tone: BadgeTone }> = {
  OCCUPIED: { label: 'Occupied', tone: 'success' },
  VACANT: { label: 'Vacant', tone: 'warning' },
  MAINTENANCE: { label: 'Maintenance', tone: 'neutral' },
};

export function RoomCard({ room, onView, onAssign }: { room: Room; onView: () => void; onAssign: () => void }) {
  const status = ROOM_STATUS[room.status];
  return (
    <Card onPress={onView} className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text variant="heading">Room {room.roomNumber}</Text>
        <Badge label={status.label} tone={status.tone} />
      </View>
      {room.currentTenant ? <Text variant="bodyMedium">{room.currentTenant.fullName}</Text> : null}
      <View className="flex-row items-end justify-between">
        <Text variant="number">{formatINR(room.monthlyRent)}<Text variant="secondary" tone="soft"> / month</Text></Text>
        {room.currentTenant ? (
          <View className="items-end">
            <Text variant="caption" tone="muted">Balance</Text>
            <Text variant="heading" tone={room.balance > 0 ? 'danger' : 'success'}>{room.balance > 0 ? formatINR(room.balance) : 'Paid'}</Text>
          </View>
        ) : null}
      </View>
      {room.status === 'VACANT' ? (
        <Button label="Assign Tenant" icon={UserPlus} variant="secondary" size="sm" onPress={onAssign} />
      ) : (
        <View className="flex-row items-center justify-end gap-1">
          <Text variant="secondaryMedium" tone="primary">View</Text>
          <Icon icon={ChevronRight} size="sm" tone="primary" />
        </View>
      )}
    </Card>
  );
}
