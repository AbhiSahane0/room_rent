import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';

interface Props {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

/** Bottom sheet built on Modal so it behaves identically on Android and iOS. */
export function Sheet({ visible, title, onClose, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Close" />
        <View className="max-h-[80%] w-full self-center rounded-t-xl bg-surface" style={{ paddingBottom: Math.max(insets.bottom, 16), maxWidth: 560 }}>
          <View className="items-center pt-2.5"><View className="h-1 w-10 rounded-full bg-line-strong" /></View>
          {title ? <Text variant="heading" className="px-5 pb-2 pt-3">{title}</Text> : <View className="h-3" />}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-2">{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}
