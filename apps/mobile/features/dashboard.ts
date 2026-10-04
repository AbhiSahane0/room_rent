import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

export interface DashboardOverview {
  username: string;
  properties: { id: string; name: string; city: string; state: string }[];
}

export const useDashboard = () => useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<DashboardOverview>('/dashboard') });
