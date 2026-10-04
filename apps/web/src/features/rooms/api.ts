import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Paginated, Room, RoomDetail, RoomStatus } from '@rental/shared';

export interface RoomFilters { propertyId?: string; status?: RoomStatus; search?: string }

const qs = (o: Record<string, string | number | undefined>) =>
  Object.entries(o).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');

export function useRooms(filters: RoomFilters) {
  return useInfiniteQuery({
    queryKey: ['rooms', 'list', filters],
    enabled: !!filters.propertyId,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get<Paginated<Room>>(`/rooms?${qs({ ...filters, page: pageParam, pageSize: 20 })}`),
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
}

export const useRoom = (id?: string) =>
  useQuery({ queryKey: ['rooms', 'detail', id], enabled: !!id, queryFn: () => api.get<RoomDetail>(`/rooms/${id}`) });

export function useSaveRoom(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => (id ? api.put<Room>(`/rooms/${id}`, body) : api.post<Room>('/rooms', body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
