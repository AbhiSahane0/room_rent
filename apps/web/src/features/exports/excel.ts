import { ApiError, authedFetch } from '@/api/client';

/** Downloads the Excel workbook of all data (optionally one property) and saves it through the browser. */
export async function downloadExcelExport(propertyId?: string) {
  const res = await authedFetch(`/exports/excel${propertyId ? `?propertyId=${propertyId}` : ''}`);
  if (!res.ok) throw new ApiError(res.status, 'The export could not be created. Please check your internet connection and try again.');
  const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? `RentManager-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return name;
}
