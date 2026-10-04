import { Camera, FileUp, Images } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Icon, Sheet, Text } from '@/components/ui';
import { chooseFile, chooseFromGallery, PickedDocument, PickError, takePhoto } from './pickFile';

interface Props {
  visible: boolean;
  title: string;
  /** File name stem used for the uploaded file (never the original device file name). */
  baseName: string;
  onClose: () => void;
  onPicked: (doc: PickedDocument) => void;
  onError: (message: string) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Take Photo / Choose From Gallery / Choose File. */
export function SourceSheet({ visible, title, baseName, onClose, onPicked, onError }: Props) {
  const run = (fn: (name: string) => Promise<PickedDocument | null>) => async () => {
    onClose();
    await sleep(300); // let the sheet finish dismissing before the system camera/picker opens (iOS)
    try {
      const doc = await fn(baseName);
      if (doc) onPicked(doc);
    } catch (e) {
      onError(e instanceof PickError ? e.message : 'Could not open that. Please try again.');
    }
  };
  const actions = [
    { icon: Camera, label: 'Take Photo', hint: 'Use the camera', fn: takePhoto },
    { icon: Images, label: 'Choose From Gallery', hint: 'Pick an existing photo', fn: chooseFromGallery },
    { icon: FileUp, label: 'Choose File', hint: 'PDF or image from your files', fn: chooseFile },
  ];
  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <View className="pb-2">
        {actions.map((a) => (
          <Pressable key={a.label} onPress={run(a.fn)} accessibilityRole="button" className="min-h-16 flex-row items-center gap-3 border-b border-line active:bg-surface-muted">
            <View className="h-10 w-10 items-center justify-center rounded-md bg-primary-soft"><Icon icon={a.icon} tone="primary" /></View>
            <View>
              <Text variant="bodyMedium">{a.label}</Text>
              <Text variant="secondary" tone="soft">{a.hint}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}
