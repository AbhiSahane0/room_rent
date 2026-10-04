import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { ActivityIndicator, Image, Linking, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { friendlyError } from '@/api/client';
import { Button, Icon, Text } from '@/components/ui';
import { colors } from '@/theme';
import type { TenantDocumentItem } from '@/types/api';
import { fetchDocumentUrl } from './api';

/**
 * Asks the backend for a temporary link every time a document is opened (gcTime 0: never cached or persisted).
 * Images render in-app; PDFs open in the system viewer.
 */
export function DocumentViewer({ doc, onClose }: { doc: TenantDocumentItem | null; onClose: () => void }) {
  const { data, error } = useQuery({
    queryKey: ['document-url', doc?.id],
    enabled: !!doc,
    queryFn: () => fetchDocumentUrl(doc!.id),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const url = data?.url;
  const isImage = doc?.mimeType.startsWith('image/');

  return (
    <Modal visible={!!doc} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-row items-center justify-between px-4 py-2">
          <Text tone="white" variant="bodyMedium" numberOfLines={1} className="flex-1 pr-3">{doc?.label ?? doc?.fileName}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} className="h-11 w-11 items-center justify-center"><Icon icon={X} size="lg" tone="white" /></Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-4">
          {error ? (
            <Text tone="white" className="text-center">{friendlyError(error)}</Text>
          ) : !url ? (
            <ActivityIndicator color={colors.primary.DEFAULT} size="large" />
          ) : isImage ? (
            <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityLabel="Document image" />
          ) : (
            <View className="w-full gap-3">
              <Text tone="white" className="text-center">This is a PDF document.</Text>
              <Button label="Open PDF" onPress={() => Linking.openURL(url)} />
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
