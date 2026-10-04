import { Directory, File, Paths } from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { ApiError, authedFetch } from '@/api/client';

const PDF_ERROR = 'The PDF could not be generated. Please check your internet connection and try again.';

export interface BillPdf {
  /** Browser only: the PDF bytes, kept so sharing can happen synchronously inside a tap. */
  blob?: Blob;
  /** Local file:// uri on devices; blob: url in the browser preview. */
  uri: string;
  fileName: string;
}

/** Downloads the invoice from the backend (authenticated, auto-refreshing) into the app cache. */
export async function fetchBillPdf(billId: string, billNumber: string): Promise<BillPdf> {
  const fileName = `Invoice-${billNumber}.pdf`;
  const res = await authedFetch(`/bills/${billId}/pdf`);
  if (!res.ok) throw new ApiError(res.status, res.status === 404 ? 'Bill not found' : PDF_ERROR);

  if (Platform.OS === 'web') {
    const blob = await res.blob();
    return { uri: URL.createObjectURL(blob), blob, fileName };
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  return { uri: file.uri, fileName };
}

/** Opens the invoice in the phone's PDF viewer. */
export async function viewPdf(pdf: BillPdf) {
  if (Platform.OS === 'web') {
    window.open(pdf.uri, '_blank');
  } else if (Platform.OS === 'android') {
    const contentUri = await getContentUriAsync(pdf.uri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: contentUri, flags: 1, type: 'application/pdf' });
  } else {
    await Sharing.shareAsync(pdf.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
}

/** Native share sheet: WhatsApp, Email, Telegram, Files, Nearby Share... whatever is installed. */
export async function sharePdf(pdf: BillPdf) {
  if (Platform.OS === 'web') {
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    const file = new globalThis.File([pdf.blob!], pdf.fileName, { type: 'application/pdf' });
    if (nav.canShare?.({ files: [file] })) return nav.share({ files: [file], title: pdf.fileName });
    await saveToDevice(pdf); // desktop browsers have no share sheet for files: download instead
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(pdf.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Share invoice' });
}

/** Saves a copy where the user chooses (Downloads, Drive, ...). Returns false if they cancelled. */
export async function saveToDevice(pdf: BillPdf): Promise<boolean> {
  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = pdf.uri;
    a.download = pdf.fileName;
    a.click();
    return true;
  }
  let dir: Directory;
  try {
    dir = await Directory.pickDirectoryAsync();
  } catch {
    return false; // picker dismissed
  }
  const source = new File(pdf.uri);
  const target = dir.createFile(pdf.fileName.replace(/\.pdf$/i, ''), 'application/pdf');
  target.write(new Uint8Array(await source.bytes()));
  return true;
}
