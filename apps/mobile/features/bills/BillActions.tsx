import { Download, FileText, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { friendlyError } from '@/api/client';
import { Button, Text } from '@/components/ui';
import { BillPdf, fetchBillPdf, saveToDevice, sharePdf, viewPdf } from './pdf';

type Action = 'view' | 'download' | 'share';

/** View PDF / Download / Share. The PDF is always rendered fresh by the backend, so it matches the bill. */
export function BillActions({ billId, billNumber }: { billId: string; billNumber: string }) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const run = (action: Action) => async () => {
    setMessage(null);
    setBusy(action);
    try {
      const pdf: BillPdf = await fetchBillPdf(billId, billNumber);
      if (action === 'view') await viewPdf(pdf);
      else if (action === 'share') await sharePdf(pdf);
      else if (await saveToDevice(pdf)) setMessage({ text: 'Invoice saved to your device.', ok: true });
    } catch (e) {
      setMessage({ text: friendlyError(e), ok: false });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="gap-3">
      <Button label={busy === 'view' ? 'Preparing PDF...' : 'View PDF'} icon={FileText} onPress={run('view')} loading={busy === 'view'} disabled={busy !== null} />
      <View className="flex-row gap-3">
        <View className="flex-1"><Button label="Download" icon={Download} variant="secondary" onPress={run('download')} loading={busy === 'download'} disabled={busy !== null} /></View>
        <View className="flex-1"><Button label="Share" icon={Share2} variant="secondary" onPress={run('share')} loading={busy === 'share'} disabled={busy !== null} /></View>
      </View>
      {message ? <Text variant="secondary" tone={message.ok ? 'success' : 'danger'}>{message.text}</Text> : null}
    </View>
  );
}
