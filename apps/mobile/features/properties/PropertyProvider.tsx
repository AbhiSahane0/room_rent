import { useQuery } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/api/client';
import { tokenStorage } from '@/services/tokenStorage';
import type { Property } from '@/types/api';

interface Ctx {
  properties: Property[];
  current: Property | null;
  setCurrentId: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

const PropertyContext = createContext<Ctx | null>(null);

export function PropertyProvider({ children }: { children: React.ReactNode }) {
  const query = useQuery({ queryKey: ['properties'], queryFn: () => api.get<Property[]>('/properties') });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    tokenStorage.getPref('propertyId').then((v) => v && setSelectedId(v));
  }, []);

  const properties = useMemo(() => query.data ?? [], [query.data]);
  // Falls back to the first property if the saved one no longer exists.
  const current = useMemo(() => properties.find((p) => p.id === selectedId) ?? properties[0] ?? null, [properties, selectedId]);

  const setCurrentId = useCallback((id: string) => {
    setSelectedId(id);
    tokenStorage.setPref('propertyId', id);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ properties, current, setCurrentId, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch }),
    [properties, current, setCurrentId, query.isLoading, query.isError, query.error, query.refetch],
  );
  return <PropertyContext.Provider value={value}>{children}</PropertyContext.Provider>;
}

export const useProperty = () => {
  const ctx = useContext(PropertyContext);
  if (!ctx) throw new Error('useProperty must be used inside PropertyProvider');
  return ctx;
};
