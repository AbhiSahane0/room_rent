import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Property } from '@/types/api';

export type PropertyInput = Pick<Property, 'name' | 'address' | 'city' | 'state' | 'pincode'> & { description?: string };

export function useSaveProperty(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Property> | PropertyInput) => (id ? api.put<Property>(`/properties/${id}`, body) : api.post<Property>('/properties', body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
