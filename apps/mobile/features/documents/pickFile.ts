import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import type { UploadFile } from '@/api/upload';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export interface PickedDocument extends UploadFile {
  size?: number;
  isImage: boolean;
}

export class PickError extends Error {}

const extFor = (mime: string) => (mime === 'application/pdf' ? 'pdf' : mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg');

/** Resizes and re-encodes photos so uploads stay small (Aadhaar/PAN stay legible at 1600px). */
async function compress(uri: string): Promise<{ uri: string }> {
  try {
    const out = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1600 } }], { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG });
    return { uri: out.uri };
  } catch {
    return { uri };
  }
}

async function fromImageAsset(asset: ImagePicker.ImagePickerAsset, baseName: string): Promise<PickedDocument> {
  const mime = (asset.mimeType ?? 'image/jpeg').toLowerCase();
  if (!ALLOWED.includes(mime) && !mime.startsWith('image/')) throw new PickError('Only photos and PDF files can be uploaded.');
  const compressed = await compress(asset.uri);
  return { uri: compressed.uri, name: `${baseName}.jpg`, mimeType: 'image/jpeg', size: asset.fileSize, isImage: true };
}

export async function takePhoto(baseName: string): Promise<PickedDocument | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new PickError('Camera access is needed to take a photo. You can allow it in your phone settings.');
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false });
  if (res.canceled || !res.assets[0]) return null;
  return fromImageAsset(res.assets[0], baseName);
}

export async function chooseFromGallery(baseName: string): Promise<PickedDocument | null> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && perm.accessPrivileges !== 'limited') throw new PickError('Photo access is needed to choose a picture. You can allow it in your phone settings.');
  }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false });
  if (res.canceled || !res.assets[0]) return null;
  return fromImageAsset(res.assets[0], baseName);
}

export async function chooseFile(baseName: string): Promise<PickedDocument | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  const mime = (a.mimeType ?? '').toLowerCase();
  if (!ALLOWED.includes(mime)) throw new PickError('Only JPG, PNG, WebP images or PDF files are allowed.');
  if (mime === 'application/pdf') {
    if ((a.size ?? 0) > MAX_FILE_BYTES) throw new PickError('This PDF is larger than 10 MB. Choose a smaller file.');
    return { uri: a.uri, name: `${baseName}.pdf`, mimeType: mime, size: a.size, isImage: false };
  }
  const compressed = await compress(a.uri);
  return { uri: compressed.uri, name: `${baseName}.${extFor('image/jpeg')}`, mimeType: 'image/jpeg', size: a.size, isImage: true };
}
