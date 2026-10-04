import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, uploadFile } from '@/api/client';
import type { DocumentType, TenantDocumentItem } from '@rental/shared';

export const useTenantDocuments = (tenantId?: string) =>
  useQuery({ queryKey: ['tenants', 'documents', tenantId], enabled: !!tenantId, queryFn: () => api.get<TenantDocumentItem[]>(`/tenants/${tenantId}/documents`) });

export function useInvalidateDocuments(tenantId: string) {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ['tenants', 'documents', tenantId] }), qc.invalidateQueries({ queryKey: ['tenants', 'detail', tenantId] })]);
}

export const uploadTenantDocument = (tenantId: string, file: Blob, fileName: string, type: DocumentType, onProgress?: (f: number) => void) =>
  uploadFile<TenantDocumentItem>(`/tenants/${tenantId}/documents`, file, fileName, { type }, onProgress);

export function useDeleteDocument(tenantId: string) {
  const invalidate = useInvalidateDocuments(tenantId);
  return useMutation({ mutationFn: (id: string) => api.delete(`/documents/${id}`), onSuccess: invalidate });
}

export const fetchDocumentUrl = (id: string) => api.get<{ url: string; expiresAt: string; mimeType: string; fileName: string }>(`/documents/${id}/url`);
