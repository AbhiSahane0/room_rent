import { Eye, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { friendlyError } from '@/api/client';
import { Button, Card, ConfirmDialog, ErrorState, Icon, Sheet, SkeletonList, Text } from '@/components/ui';
import type { DocumentType, TenantDocumentItem } from '@/types/api';
import { formatDate } from '@/utils/format';
import { DOC_META, DOC_ORDER } from './constants';
import { uploadTenantDocument, useDeleteDocument, useInvalidateDocuments, useTenantDocuments } from './api';
import { DocumentViewer } from './DocumentViewer';
import type { PickedDocument } from './pickFile';
import { SourceSheet } from './SourceSheet';

export function DocumentsSection({ tenantId }: { tenantId: string }) {
  const { data, isLoading, isError, error, refetch } = useTenantDocuments(tenantId);
  const remove = useDeleteDocument(tenantId);
  const invalidate = useInvalidateDocuments(tenantId);
  const [viewing, setViewing] = useState<TenantDocumentItem | null>(null);
  const [deleting, setDeleting] = useState<TenantDocumentItem | null>(null);
  const [typeSheet, setTypeSheet] = useState(false);
  const [source, setSource] = useState<DocumentType | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const upload = async (type: DocumentType, doc: PickedDocument) => {
    setMessage(null);
    setProgress(0);
    try {
      await uploadTenantDocument(tenantId, doc, type, setProgress);
      await invalidate();
    } catch (e) {
      setMessage(friendlyError(e));
    } finally {
      setProgress(null);
    }
  };

  if (isLoading) return <View className="mt-4"><SkeletonList count={2} lines={2} /></View>;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  const docs = data ?? [];
  return (
    <View className="mt-4 gap-3">
      <Button label="Add Document" icon={Plus} variant="secondary" onPress={() => setTypeSheet(true)} loading={progress !== null} />
      {progress !== null ? <Text variant="secondary" tone="soft" className="text-center">Uploading securely... {Math.round(progress * 100)}%</Text> : null}
      {message ? <Text variant="secondary" tone="danger">{message}</Text> : null}

      {DOC_ORDER.map((type) => {
        const items = docs.filter((d) => d.type === type);
        const meta = DOC_META[type];
        if (type === 'OTHER' && items.length === 0) return null;
        return (
          <Card key={type} className="gap-2">
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-md bg-primary-soft"><Icon icon={meta.icon} tone="primary" /></View>
              <Text variant="heading" className="flex-1">{meta.label}</Text>
              {items.length === 0 ? <Text variant="secondary" tone="warning">Not uploaded</Text> : null}
            </View>
            {items.map((d) => (
              <View key={d.id} className="flex-row items-center gap-2 border-t border-line pt-2">
                <View className="flex-1">
                  <Text variant="bodyMedium" numberOfLines={1}>{d.label ?? d.fileName}</Text>
                  <Text variant="caption" tone="muted">Added {formatDate(d.createdAt)} · {Math.max(1, Math.round(d.sizeBytes / 1024))} KB</Text>
                </View>
                <Pressable onPress={() => setViewing(d)} accessibilityRole="button" accessibilityLabel={`View ${meta.label}`} hitSlop={6} className="h-11 w-11 items-center justify-center rounded-full active:bg-surface-muted"><Icon icon={Eye} tone="primary" /></Pressable>
                <Pressable onPress={() => setDeleting(d)} accessibilityRole="button" accessibilityLabel={`Delete ${meta.label}`} hitSlop={6} className="h-11 w-11 items-center justify-center rounded-full active:bg-surface-muted"><Icon icon={Trash2} tone="danger" /></Pressable>
              </View>
            ))}
          </Card>
        );
      })}

      <Sheet visible={typeSheet} title="Document type" onClose={() => setTypeSheet(false)}>
        {DOC_ORDER.map((t) => (
          <Pressable key={t} accessibilityRole="button" onPress={() => { setTypeSheet(false); setTimeout(() => setSource(t), 350); }} className="min-h-14 flex-row items-center gap-3 border-b border-line">
            <Icon icon={DOC_META[t].icon} tone="primary" /><Text variant="bodyMedium">{DOC_META[t].label}</Text>
          </Pressable>
        ))}
      </Sheet>
      <SourceSheet
        visible={source !== null}
        title={source ? DOC_META[source].label : ''}
        baseName={source ? DOC_META[source].short : 'document'}
        onClose={() => setSource(null)}
        onPicked={(d) => source && upload(source, d)}
        onError={setMessage}
      />
      <DocumentViewer doc={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog
        visible={!!deleting}
        title="Delete this document?"
        message="The file is permanently removed from secure storage."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={async () => { if (deleting) { await remove.mutateAsync(deleting.id).catch((e) => setMessage(friendlyError(e))); setDeleting(null); } }}
        onCancel={() => setDeleting(null)}
      />
    </View>
  );
}
