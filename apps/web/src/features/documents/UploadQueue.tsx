import { CircleAlert, CircleCheck, Upload } from 'lucide-react';
import { Button, Icon, Spinner } from '@/components/ui';
import type { DocumentType } from '@rental/shared';
import { DOC_META } from './constants';

export interface QueueItem { type: DocumentType; status: 'pending' | 'uploading' | 'done' | 'failed'; progress: number; error?: string }

/** Blocking progress dialog shown while documents upload after a tenant is saved. */
export function UploadQueue({ open, items, onRetry, onContinue }: { open: boolean; items: QueueItem[]; onRetry: () => void; onContinue: () => void }) {
  if (!open) return null;
  const uploading = items.some((i) => i.status === 'uploading' || i.status === 'pending');
  const failed = items.filter((i) => i.status === 'failed');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div role="dialog" aria-modal="true" className="w-full max-w-sm space-y-4 rounded-xl bg-surface p-5 shadow-xl">
        <div className="flex items-center gap-2"><Icon icon={Upload} tone="primary" /><h2 className="text-heading">{uploading ? 'Uploading documents...' : failed.length ? 'Some uploads failed' : 'Documents uploaded'}</h2></div>
        {items.map((i) => (
          <div key={i.type} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium">{DOC_META[i.type].label}</span>
              {i.status === 'done' ? <Icon icon={CircleCheck} tone="success" /> : i.status === 'failed' ? <Icon icon={CircleAlert} tone="danger" /> : i.status === 'uploading' ? <Spinner className="text-primary" /> : <span className="text-small text-ink-muted">Waiting</span>}
            </div>
            {i.status === 'uploading' || i.status === 'done' ? <div className="h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((i.status === 'done' ? 1 : i.progress) * 100)}%` }} /></div> : null}
            {i.status === 'failed' ? <p className="text-small text-danger">{i.error}</p> : null}
          </div>
        ))}
        {!uploading && failed.length ? (
          <div className="space-y-2">
            <Button onClick={onRetry}>Retry failed uploads</Button>
            <Button variant="ghost" onClick={onContinue}>Continue without them</Button>
            <p className="text-center text-caption text-ink-muted">You can upload them later from the tenant profile.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
