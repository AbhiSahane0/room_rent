import { Camera, Check, FileText, RefreshCw, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Card, Icon, Text } from '@/components/ui';
import type { DocumentType } from '@/types/api';
import { DOC_META } from './constants';
import type { PickedDocument } from './pickFile';
import { SourceSheet } from './SourceSheet';

/** One document type in the Add Tenant flow: shows add actions, then a preview with retake/remove. */
export function DocumentSlot({ type, value, onChange }: { type: DocumentType; value?: PickedDocument; onChange: (d?: PickedDocument) => void }) {
  const meta = DOC_META[type];
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-md bg-primary-soft"><Icon icon={meta.icon} tone="primary" /></View>
        <View className="flex-1">
          <Text variant="heading">{meta.label}</Text>
          <Text variant="secondary" tone="soft">{value ? 'Ready to upload' : 'Optional'}</Text>
        </View>
        {value ? <View className="h-6 w-6 items-center justify-center rounded-full bg-success"><Icon icon={Check} size={14} tone="white" /></View> : null}
      </View>

      {value ? (
        <View className="gap-3">
          <View className="h-44 items-center justify-center overflow-hidden rounded-md bg-surface-muted">
            {value.isImage ? (
              <Image source={{ uri: value.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityLabel={`${meta.label} preview`} />
            ) : (
              <View className="items-center gap-1"><Icon icon={FileText} size={32} tone="muted" /><Text variant="secondary" tone="soft">PDF document</Text></View>
            )}
          </View>
          <View className="flex-row gap-3">
            <Pressable onPress={() => setOpen(true)} accessibilityRole="button" className="h-10 flex-1 flex-row items-center justify-center gap-2 rounded-md border border-line-strong active:bg-surface-muted">
              <Icon icon={RefreshCw} size="sm" tone="ink" /><Text variant="secondaryMedium">Retake / Replace</Text>
            </Pressable>
            <Pressable onPress={() => onChange(undefined)} accessibilityRole="button" accessibilityLabel={`Remove ${meta.label}`} className="h-10 flex-1 flex-row items-center justify-center gap-2 rounded-md bg-danger-soft active:opacity-80">
              <Icon icon={Trash2} size="sm" tone="danger" /><Text variant="secondaryMedium" tone="danger">Remove</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" className="h-11 flex-row items-center justify-center gap-2 rounded-md border border-dashed border-line-strong active:bg-surface-muted">
          <Icon icon={Camera} tone="primary" /><Text variant="bodyMedium" tone="primary">Add {meta.label}</Text>
        </Pressable>
      )}
      {error ? <Text variant="secondary" tone="danger">{error}</Text> : null}

      <SourceSheet visible={open} title={meta.label} baseName={meta.short} onClose={() => setOpen(false)} onPicked={(d) => { setError(null); onChange(d); }} onError={setError} />
    </Card>
  );
}
