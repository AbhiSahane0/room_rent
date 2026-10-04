import { FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { friendlyError } from '@/api/client';
import { Button, Notice } from '@/components/ui';
import { downloadExcelExport } from './excel';

/** One tap: builds the workbook on the server and downloads it. */
export function ExportButton({ propertyId, variant = 'secondary' }: { propertyId?: string; variant?: 'primary' | 'secondary' }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async () => {
    setBusy(true); setMessage(null);
    try {
      const name = await downloadExcelExport(propertyId);
      setMessage({ ok: true, text: `Downloaded ${name}` });
    } catch (e) { setMessage({ ok: false, text: friendlyError(e) }); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-2">
      <Button variant={variant} icon={FileSpreadsheet} loading={busy} onClick={() => void run()}>{busy ? 'Preparing Excel file...' : 'Export all data to Excel'}</Button>
      {message ? <Notice tone={message.ok ? 'success' : 'danger'}>{message.text}</Notice> : null}
    </div>
  );
}
