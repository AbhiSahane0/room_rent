import { Download, FileText, Share2 } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { friendlyError } from '@/api/client';
import { Button, Text } from '@/components/ui';
import { BillPdf, fetchBillPdf, saveToDevice, sharePdf, viewPdf } from './pdf';

type Action = 'view' | 'download' | 'share';
const isWeb = Platform.OS === 'web';

/**
 * View PDF / Download / Share. The PDF is always rendered fresh by the backend, so it matches the bill.
 * In a browser the PDF is fetched ahead of time: Safari only allows share sheets and new tabs directly inside a tap,
 * not after a network wait.
 */
export function BillActions({ billId, billNumber, version }: { billId: string; billNumber: string; /** changes when the bill changes (e.g. a payment), so a prefetched PDF is refreshed */ version?: string }) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  // Browser only. gcTime 0 so the blob is not kept around after leaving the screen.
  const prefetch = useQuery({ queryKey: ['pdf-blob', billId, version], enabled: isWeb, queryFn: () => fetchBillPdf(billId, billNumber), staleTime: 0, gcTime: 0, retry: 1 });
  const prepared: BillPdf | null = prefetch.data ?? null;
  const prepError = prefetch.error ? friendlyError(prefetch.error) : null;

  const run = (action: Action) => async () => {
    setMessage(null);
    if (isWeb && !prepared) return;
    setBusy(action);
    try {
      const pdf = prepared ?? (await fetchBillPdf(billId, billNumber));
      if (action === 'view') await viewPdf(pdf);
      else if (action === 'share') await sharePdf(pdf);
      else if (await saveToDevice(pdf)) setMessage({ text: isWeb ? 'Invoice downloaded.' : 'Invoice saved to your device.', ok: true });
    } catch (e) {
      // Closing the share sheet is not an error.
      if (!(e instanceof Error && e.name === 'AbortError')) setMessage({ text: friendlyError(e), ok: false });
    } finally {
      setBusy(null);
    }
  };

  const waiting = isWeb && !prepared && !prepError;
  return (
    <View className="gap-3">
      <Button label={waiting ? 'Preparing PDF...' : busy === 'view' ? 'Opening...' : 'View PDF'} icon={FileText} onPress={run('view')} loading={busy === 'view' || waiting} disabled={busy !== null || (isWeb && !prepared)} />
      <View className="flex-row gap-3">
        <View className="flex-1"><Button label="Download" icon={Download} variant="secondary" onPress={run('download')} loading={busy === 'download'} disabled={busy !== null || (isWeb && !prepared)} /></View>
        <View className="flex-1"><Button label="Share" icon={Share2} variant="secondary" onPress={run('share')} loading={busy === 'share'} disabled={busy !== null || (isWeb && !prepared)} /></View>
      </View>
      {message || prepError ? <Text variant="secondary" tone={message?.ok ? 'success' : 'danger'}>{message?.text ?? prepError}</Text> : null}
    </View>
  );
}
