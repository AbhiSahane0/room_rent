import { useQuery } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/api/client';
import type { Property } from '@rental/shared';

interface Ctx {
  properties: Property[];
  current: Property | null;
  /** The property remembered from the last visit: lets screens start loading before the property list arrives. */
  rememberedId: string | null;
  setCurrentId: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

const PropertyContext = createContext<Ctx | null>(null);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const query = useQuery({ queryKey: ['properties'], queryFn: () => api.get<Property[]>('/properties') });
  const [selectedId, setSelectedId] = useState<string | null>(() => localStorage.getItem('pref.propertyId'));
  const properties = useMemo(() => query.data ?? [], [query.data]);
  // Falls back to the first property if the remembered one no longer exists.
  const current = useMemo(() => properties.find((p) => p.id === selectedId) ?? properties[0] ?? null, [properties, selectedId]);
  const setCurrentId = useCallback((id: string) => {
    setSelectedId(id);
    localStorage.setItem('pref.propertyId', id);
  }, []);
  const value = useMemo<Ctx>(
    () => ({ properties, current, rememberedId: selectedId, setCurrentId, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: () => void query.refetch() }),
    [properties, current, selectedId, setCurrentId, query],
  );
  return <PropertyContext.Provider value={value}>{children}</PropertyContext.Provider>;
}

export const useProperty = () => {
  const ctx = useContext(PropertyContext);
  if (!ctx) throw new Error('useProperty must be used inside PropertyProvider');
  return ctx;
};
