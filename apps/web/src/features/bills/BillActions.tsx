import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { friendlyError } from '@/api/client';
import { Button, Notice } from '@/components/ui';
import { downloadPdf, fetchBillPdf, sharePdf, viewPdf } from './pdf';

/**
 * View PDF / Download / Share. The PDF is rendered fresh by the backend and fetched ahead of time, because browsers
 * (Safari especially) only allow new tabs and share sheets directly inside a tap, not after a network wait.
 */
export function BillActions({ billId, billNumber, version }: { billId: string; billNumber: string; /** changes when the bill changes, so a prefetched PDF is refreshed */ version?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const prefetch = useQuery({ queryKey: ['pdf-blob', billId, version], queryFn: () => fetchBillPdf(billId, billNumber), staleTime: 0, gcTime: 0, retry: 1 });
  const pdf = prefetch.data ?? null;
  useEffect(() => () => { if (pdf) URL.revokeObjectURL(pdf.url); }, [pdf]);
  const prepError = prefetch.error ? friendlyError(prefetch.error) : null;
  const waiting = !pdf && !prepError;

  const view = () => { if (pdf) { setMessage(null); viewPdf(pdf); } };
  const download = () => { if (pdf) { downloadPdf(pdf); setMessage({ text: 'Invoice downloaded.', ok: true }); } };
  const share = async () => {
    if (!pdf) return;
    setMessage(null); setBusy(true);
    try {
      if ((await sharePdf(pdf)) === 'downloaded') setMessage({ text: 'Sharing is not available in this browser, so the invoice was downloaded.', ok: true });
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError')) setMessage({ text: friendlyError(e), ok: false });
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <Button icon={FileText} onClick={view} loading={waiting} disabled={!pdf}>{waiting ? 'Preparing PDF...' : 'View PDF'}</Button>
      <div className="flex gap-3">
        <Button variant="secondary" icon={Download} onClick={download} disabled={!pdf}>Download</Button>
        <Button variant="secondary" icon={Share2} onClick={() => void share()} loading={busy} disabled={!pdf}>Share</Button>
      </div>
      {message || prepError ? <Notice tone={message?.ok ? 'success' : 'danger'}>{message?.text ?? prepError}</Notice> : null}
    </div>
  );
}
