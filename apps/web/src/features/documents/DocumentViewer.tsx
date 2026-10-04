import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { friendlyError } from '@/api/client';
import { Icon, Spinner } from '@/components/ui';
import type { TenantDocumentItem } from '@rental/shared';
import { fetchDocumentUrl } from './api';

/** Asks the backend for a temporary link every time a document is opened (never cached). Images show inline; PDFs open in a new tab. */
export function DocumentViewer({ doc, onClose }: { doc: TenantDocumentItem | null; onClose: () => void }) {
  const { data, error } = useQuery({ queryKey: ['document-url', doc?.id], enabled: !!doc, queryFn: () => fetchDocumentUrl(doc!.id), staleTime: 0, gcTime: 0, retry: false });
  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [doc, onClose]);
  if (!doc) return null;
  const url = data?.url;
  const isImage = doc.mimeType.startsWith('image/');
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="min-w-0 flex-1 truncate pr-3 font-medium text-white">{doc.label ?? doc.fileName}</span>
        <button type="button" aria-label="Close" onClick={onClose} className="flex h-11 w-11 items-center justify-center"><Icon icon={X} size={24} tone="white" /></button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
        {error ? <p className="text-center text-white">{friendlyError(error)}</p>
          : !url ? <Spinner className="h-8 w-8 text-white" />
          : isImage ? <img src={url} alt="Document" className="max-h-full max-w-full object-contain" />
          : <div className="space-y-3 text-center text-white"><p>This is a PDF document.</p><a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center rounded-md bg-primary px-6 font-semibold">Open PDF</a></div>}
      </div>
    </div>
  );
}
