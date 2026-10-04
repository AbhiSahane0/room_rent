import { Camera, Check, FileText, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Card, Icon } from '@/components/ui';
import type { DocumentType } from '@rental/shared';
import { DOC_META } from './constants';
import type { PreparedFile } from './prepareFile';
import { SourceModal } from './SourceModal';

/** One document type in the Add Tenant flow: add actions, then a preview with replace/remove. */
export function DocumentSlot({ type, value, onChange }: { type: DocumentType; value?: PreparedFile; onChange: (d?: PreparedFile) => void }) {
  const meta = DOC_META[type];
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft"><Icon icon={meta.icon} tone="primary" /></span>
        <div className="flex-1"><div className="text-heading">{meta.label}</div><div className="text-small text-ink-soft">{value ? 'Ready to upload' : 'Optional'}</div></div>
        {value ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success"><Icon icon={Check} size={14} tone="white" /></span> : null}
      </div>
      {value ? (
        <div className="space-y-3">
          <div className="flex h-44 items-center justify-center overflow-hidden rounded-md bg-surface-muted">
            {value.isImage ? <img src={value.previewUrl} alt={`${meta.label} preview`} className="h-full w-full object-contain" /> : <div className="flex flex-col items-center gap-1"><Icon icon={FileText} size={32} tone="muted" /><span className="text-small text-ink-soft">PDF document</span></div>}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setOpen(true)} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-line-strong text-small font-medium hover:bg-surface-muted"><Icon icon={RefreshCw} size={16} tone="ink" />Retake / Replace</button>
            <button type="button" onClick={() => onChange(undefined)} aria-label={`Remove ${meta.label}`} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-danger-soft text-small font-medium text-danger hover:opacity-80"><Icon icon={Trash2} size={16} tone="danger" />Remove</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-dashed border-line-strong font-medium text-primary hover:bg-surface-muted"><Icon icon={Camera} tone="primary" />Add {meta.label}</button>
      )}
      {error ? <p className="text-small text-danger">{error}</p> : null}
      <SourceModal open={open} title={meta.label} baseName={meta.short} onClose={() => setOpen(false)} onPicked={(d) => { setError(null); onChange(d); }} onError={setError} />
    </Card>
  );
}
