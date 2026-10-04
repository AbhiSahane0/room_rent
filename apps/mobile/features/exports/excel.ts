import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { ApiError, authedFetch } from '@/api/client';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const FAILED = 'The export could not be created. Please check your internet connection and try again.';

/** Builds the Excel workbook of all data on the server, then hands it to the share sheet (Files, Drive, WhatsApp, Email...) or downloads it in a browser. */
export async function exportExcel(propertyId?: string): Promise<string> {
  const res = await authedFetch(`/exports/excel${propertyId ? `?propertyId=${propertyId}` : ''}`);
  if (!res.ok) throw new ApiError(res.status, FAILED);
  const fileName = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? `RentManager-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    return fileName;
  }
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(new Uint8Array(await res.arrayBuffer()));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: XLSX, UTI: 'org.openxmlformats.spreadsheetml.sheet', dialogTitle: 'Save or share the Excel file' });
  return fileName;
}
