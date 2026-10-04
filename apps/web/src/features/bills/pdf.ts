import { ApiError, authedFetch } from '@/api/client';

export interface BillPdf {
  url: string;
  blob: Blob;
  fileName: string;
}

/** Downloads the invoice from the API (authenticated, with silent token refresh). */
export async function fetchBillPdf(billId: string, billNumber: string): Promise<BillPdf> {
  const res = await authedFetch(`/bills/${billId}/pdf`);
  if (!res.ok) throw new ApiError(res.status, res.status === 404 ? 'Bill not found' : 'The PDF could not be generated. Please check your internet connection and try again.');
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), blob, fileName: `Invoice-${billNumber}.pdf` };
}

/** Must be called directly from a tap: browsers (Safari especially) block new tabs opened after waiting on the network. */
export const viewPdf = (pdf: BillPdf) => void window.open(pdf.url, '_blank', 'noopener');

export function downloadPdf(pdf: BillPdf) {
  const a = document.createElement('a');
  a.href = pdf.url;
  a.download = pdf.fileName;
  a.click();
}

/** Native share sheet where the browser supports sharing files (iPhone Safari, Android Chrome); otherwise a download. */
export async function sharePdf(pdf: BillPdf) {
  const file = new File([pdf.blob], pdf.fileName, { type: 'application/pdf' });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], title: pdf.fileName });
    return 'shared' as const;
  }
  downloadPdf(pdf);
  return 'downloaded' as const;
}
