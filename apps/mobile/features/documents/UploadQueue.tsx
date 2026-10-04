import { CircleAlert, CircleCheck, Upload } from 'lucide-react-native';
import { ActivityIndicator, Modal, View } from 'react-native';
import { Button, Icon, ProgressBar, Text } from '@/components/ui';
import { colors } from '@/theme';
import { DOC_META } from './constants';
import type { DocumentType } from '@/types/api';

export interface QueueItem {
  type: DocumentType;
  status: 'pending' | 'uploading' | 'done' | 'failed';
  progress: number;
  error?: string;
}

/** Blocking progress sheet shown while documents upload after a tenant is saved. */
export function UploadQueue({ visible, items, onRetry, onContinue }: { visible: boolean; items: QueueItem[]; onRetry: () => void; onContinue: () => void }) {
  const uploading = items.some((i) => i.status === 'uploading' || i.status === 'pending');
  const failed = items.filter((i) => i.status === 'failed');
  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <View className="flex-1 items-center justify-center bg-black/40 px-6">
        <View className="w-full max-w-sm gap-4 rounded-xl bg-surface p-5">
          <View className="flex-row items-center gap-2">
            <Icon icon={Upload} tone="primary" />
            <Text variant="heading">{uploading ? 'Uploading documents...' : failed.length ? 'Some uploads failed' : 'Documents uploaded'}</Text>
          </View>
          {items.map((i) => (
            <View key={i.type} className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text variant="bodyMedium">{DOC_META[i.type].label}</Text>
                {i.status === 'done' ? <Icon icon={CircleCheck} tone="success" /> : i.status === 'failed' ? <Icon icon={CircleAlert} tone="danger" /> : i.status === 'uploading' ? <ActivityIndicator size="small" color={colors.primary.DEFAULT} /> : <Text variant="secondary" tone="muted">Waiting</Text>}
              </View>
              {i.status === 'uploading' || i.status === 'done' ? <ProgressBar value={i.status === 'done' ? 1 : i.progress} tint="bg-primary" track="bg-line" /> : null}
              {i.status === 'failed' ? <Text variant="secondary" tone="danger">{i.error}</Text> : null}
            </View>
          ))}
          {!uploading && failed.length ? (
            <View className="gap-2">
              <Button label="Retry failed uploads" onPress={onRetry} />
              <Button label="Continue without them" variant="ghost" onPress={onContinue} />
              <Text variant="caption" tone="muted" className="text-center">You can upload them later from the tenant profile.</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
