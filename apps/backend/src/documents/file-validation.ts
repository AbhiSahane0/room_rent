import { BadRequestException } from '@nestjs/common';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/webp', ext: 'webp', test: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
  { mime: 'application/pdf', ext: 'pdf', test: (b) => b.subarray(0, 5).toString('ascii') === '%PDF-' },
];

/** Trusts file contents, not the client-declared type or extension. */
export function sniffFile(buffer: Buffer): { mime: string; ext: string } {
  if (!buffer?.length) throw new BadRequestException('The uploaded file is empty');
  if (buffer.length > MAX_UPLOAD_BYTES) throw new BadRequestException('File is too large (maximum 10 MB)');
  const found = SIGNATURES.find((s) => s.test(buffer));
  if (!found) throw new BadRequestException('Only JPG, PNG, WebP images or PDF files are allowed');
  return { mime: found.mime, ext: found.ext };
}

/** Keeps the display name harmless; the storage key never uses it. */
export function safeFileName(name: string | undefined, ext: string): string {
  const base = (name ?? 'document').replace(/\.[^.]*$/, '').replace(/[^\w\- ]/g, '_').trim().slice(0, 60) || 'document';
  return `${base}.${ext}`;
}
