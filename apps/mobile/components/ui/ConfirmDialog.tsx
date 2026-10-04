import { Modal, Pressable, View } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ visible, title, message, confirmLabel = 'Confirm', destructive, loading, onConfirm, onCancel }: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable className="flex-1 items-center justify-center bg-black/40 px-6" onPress={loading ? undefined : onCancel}>
        <Pressable className="w-full max-w-sm rounded-xl bg-surface p-5" onPress={() => undefined}>
          <Text variant="heading">{title}</Text>
          {message ? <Text tone="soft" className="mt-1.5">{message}</Text> : null}
          <View className="mt-5 flex-row gap-3">
            <View className="flex-1"><Button label="Cancel" variant="secondary" onPress={onCancel} disabled={loading} /></View>
            <View className="flex-1"><Button label={confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} loading={loading} /></View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
