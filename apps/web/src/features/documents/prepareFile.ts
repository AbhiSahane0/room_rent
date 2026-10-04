export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export class FileError extends Error {}

export interface PreparedFile {
  blob: Blob;
  name: string;
  mimeType: string;
  isImage: boolean;
  /** Object URL for previews; revoke when done. */
  previewUrl: string;
}

/** Photos are resized to 1600px and re-encoded as JPEG (Aadhaar and PAN stay legible). PDFs pass through untouched. */
export async function prepareFile(file: File, baseName: string): Promise<PreparedFile> {
  const type = file.type.toLowerCase();
  if (!ALLOWED.includes(type)) throw new FileError('Only JPG, PNG, WebP images or PDF files are allowed.');
  if (type === 'application/pdf') {
    if (file.size > MAX_FILE_BYTES) throw new FileError('This PDF is larger than 10 MB. Choose a smaller file.');
    return { blob: file, name: `${baseName}.pdf`, mimeType: type, isImage: false, previewUrl: URL.createObjectURL(file) };
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => {
    throw new FileError('That image could not be read. Try another photo.');
  });
  const scale = Math.min(1, 1600 / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.72));
  if (!blob) throw new FileError('That image could not be processed.');
  if (blob.size > MAX_FILE_BYTES) throw new FileError('This image is still larger than 10 MB. Choose a smaller one.');
  return { blob, name: `${baseName}.jpg`, mimeType: 'image/jpeg', isImage: true, previewUrl: URL.createObjectURL(blob) };
}
