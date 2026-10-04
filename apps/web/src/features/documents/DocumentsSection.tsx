import { Eye, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { friendlyError } from '@/api/client';
import { Button, Card, ConfirmDialog, ErrorState, Icon, Modal, Notice, SkeletonList } from '@/components/ui';
import type { DocumentType, TenantDocumentItem } from '@rental/shared';
import { formatDate } from '@/utils/format';
import { DOC_META, DOC_ORDER } from './constants';
import { uploadTenantDocument, useDeleteDocument, useInvalidateDocuments, useTenantDocuments } from './api';
import { DocumentViewer } from './DocumentViewer';
import type { PreparedFile } from './prepareFile';
import { SourceModal } from './SourceModal';

export function DocumentsSection({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError, error, refetch } = useTenantDocuments(tenantId);
  const remove = useDeleteDocument(tenantId);
  const invalidate = useInvalidateDocuments(tenantId);
  const [viewing, setViewing] = useState<TenantDocumentItem | null>(null);
  const [deleting, setDeleting] = useState<TenantDocumentItem | null>(null);
  const [typeModal, setTypeModal] = useState(false);
  const [source, setSource] = useState<DocumentType | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const upload = async (type: DocumentType, f: PreparedFile) => {
    setMessage(null); setProgress(0);
    try {
      await uploadTenantDocument(tenantId, f.blob, f.name, type, setProgress);
      await invalidate();
    } catch (e) { setMessage(friendlyError(e)); } finally { URL.revokeObjectURL(f.previewUrl); setProgress(null); }
  };

  if (isLoading) return <div className="mt-4"><SkeletonList count={2} /></div>;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const docs = data ?? [];
  return (
    <div className="mt-4 space-y-3">
      <Button variant="secondary" icon={Plus} onClick={() => setTypeModal(true)} loading={progress !== null}>Add Document</Button>
      {progress !== null ? <p className="text-center text-small text-ink-soft">Uploading securely... {Math.round(progress * 100)}%</p> : null}
      {message ? <Notice tone="danger">{message}</Notice> : null}
      {DOC_ORDER.map((type) => {
        const items = docs.filter((d) => d.type === type);
        const meta = DOC_META[type];
        if (type === 'OTHER' && items.length === 0) return null;
        return (
          <Card key={type} className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft"><Icon icon={meta.icon} tone="primary" /></span>
              <span className="flex-1 text-heading">{meta.label}</span>
              {items.length === 0 ? <span className="text-small text-warning">Not uploaded</span> : null}
            </div>
            {items.map((d) => (
              <div key={d.id} className="flex items-center gap-2 border-t border-line pt-2">
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{d.label ?? d.fileName}</div><div className="text-caption text-ink-muted">Added {formatDate(d.createdAt)} · {Math.max(1, Math.round(d.sizeBytes / 1024))} KB</div></div>
                <button type="button" onClick={() => setViewing(d)} aria-label={`View ${meta.label}`} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-muted"><Icon icon={Eye} tone="primary" /></button>
                <button type="button" onClick={() => setDeleting(d)} aria-label={`Delete ${meta.label}`} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-muted"><Icon icon={Trash2} tone="danger" /></button>
              </div>
            ))}
          </Card>
        );
      })}
      <Modal open={typeModal} title="Document type" onClose={() => setTypeModal(false)}>
        {DOC_ORDER.map((t) => (
          <button key={t} type="button" onClick={() => { setTypeModal(false); setSource(t); }} className="flex min-h-14 w-full items-center gap-3 border-b border-line text-left last:border-0 hover:bg-surface-muted">
            <Icon icon={DOC_META[t].icon} tone="primary" /><span className="font-medium">{DOC_META[t].label}</span>
          </button>
        ))}
      </Modal>
      <SourceModal open={source !== null} title={source ? DOC_META[source].label : ''} baseName={source ? DOC_META[source].short : 'document'} onClose={() => setSource(null)} onPicked={(f) => source && void upload(source, f)} onError={setMessage} />
      <DocumentViewer doc={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog open={!!deleting} title="Delete this document?" message="The file is permanently removed from secure storage." confirmLabel="Delete" destructive loading={remove.isPending}
        onConfirm={async () => { if (deleting) { await remove.mutateAsync(deleting.id).catch((e) => setMessage(friendlyError(e))); setDeleting(null); } }} onCancel={() => setDeleting(null)} />
    </div>
  );
}
