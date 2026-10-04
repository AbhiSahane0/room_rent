import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

export interface DashboardOverview {
  username: string;
  properties: { id: string; name: string; city: string; state: string }[];
}

export const useDashboard = () => useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<DashboardOverview>('/dashboard') });

/** Display name for the greeting; falls back to "Owner" while loading. */
export function useAuthName() {
  const { data } = useDashboard();
  return data?.username ? data.username.charAt(0).toUpperCase() + data.username.slice(1) : 'Owner';
}
