import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { CollectionReport, DashboardData, OccupancyReport, OutstandingReport } from '@/types/api';

export const useDashboard = (propertyId?: string) =>
  useQuery({ queryKey: ['dashboard', propertyId], queryFn: () => api.get<DashboardData>(`/dashboard${propertyId ? `?propertyId=${propertyId}` : ''}`) });

/** The dashboard greeting should use the owner’s display name, not the default admin username. */
export function ownerName(username?: string) {
  if (!username) return 'Narayan';
  const normalized = username.trim();
  if (!normalized) return 'Narayan';
  if (normalized.toLowerCase() === 'admin') return 'Narayan';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export const useCollectionReport = (propertyId: string | undefined, month: string) =>
  useQuery({ queryKey: ['reports', 'collection', propertyId, month], enabled: !!propertyId, queryFn: () => api.get<CollectionReport>(`/reports/collection?propertyId=${propertyId}&month=${month}`) });

export const useOccupancyReport = (propertyId?: string) =>
  useQuery({ queryKey: ['reports', 'occupancy', propertyId], enabled: !!propertyId, queryFn: () => api.get<OccupancyReport>(`/reports/occupancy?propertyId=${propertyId}`) });

export const useOutstandingReport = (propertyId?: string) =>
  useQuery({ queryKey: ['reports', 'outstanding', propertyId], enabled: !!propertyId, queryFn: () => api.get<OutstandingReport>(`/reports/outstanding?propertyId=${propertyId}`) });
