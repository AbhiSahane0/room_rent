import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { CollectionReport, DashboardData, OccupancyReport, OutstandingReport } from '@/types/api';

export const useDashboard = (propertyId?: string) =>
  useQuery({ queryKey: ['dashboard', propertyId], queryFn: () => api.get<DashboardData>(`/dashboard${propertyId ? `?propertyId=${propertyId}` : ''}`) });

/** Display name for the greeting; falls back to "Owner" while loading. */
export function ownerName(username?: string) {
  return username ? username.charAt(0).toUpperCase() + username.slice(1) : 'Owner';
}

export const useCollectionReport = (propertyId: string | undefined, month: string) =>
  useQuery({ queryKey: ['reports', 'collection', propertyId, month], enabled: !!propertyId, queryFn: () => api.get<CollectionReport>(`/reports/collection?propertyId=${propertyId}&month=${month}`) });

export const useOccupancyReport = (propertyId?: string) =>
  useQuery({ queryKey: ['reports', 'occupancy', propertyId], enabled: !!propertyId, queryFn: () => api.get<OccupancyReport>(`/reports/occupancy?propertyId=${propertyId}`) });

export const useOutstandingReport = (propertyId?: string) =>
  useQuery({ queryKey: ['reports', 'outstanding', propertyId], enabled: !!propertyId, queryFn: () => api.get<OutstandingReport>(`/reports/outstanding?propertyId=${propertyId}`) });
