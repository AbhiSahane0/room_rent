import type { BadgeTone } from '@/components/ui';
import type { RoomStatus } from '@rental/shared';

export const ROOM_STATUS: Record<RoomStatus, { label: string; tone: BadgeTone }> = {
  OCCUPIED: { label: 'Occupied', tone: 'success' },
  VACANT: { label: 'Vacant', tone: 'warning' },
  MAINTENANCE: { label: 'Maintenance', tone: 'neutral' },
};
