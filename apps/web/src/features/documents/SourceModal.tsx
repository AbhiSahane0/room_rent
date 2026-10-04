import { Camera, FolderOpen } from 'lucide-react';
import { useRef } from 'react';
import { Icon, Modal } from '@/components/ui';
import { FileError, prepareFile, type PreparedFile } from './prepareFile';

/** Choose how to add a document: take a photo (opens the camera on phones) or pick a file (gallery, files, PDF). */
export function SourceModal({ open, title, baseName, onClose, onPicked, onError }: { open: boolean; title: string; baseName: string; onClose: () => void; onPicked: (f: PreparedFile) => void; onError: (m: string) => void }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handle = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    onClose();
    try {
      onPicked(await prepareFile(file, baseName));
    } catch (e) {
      onError(e instanceof FileError ? e.message : 'That file could not be read.');
    }
  };

  const Option = ({ icon, label, hint, onClick }: { icon: typeof Camera; label: string; hint: string; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="flex min-h-16 w-full items-center gap-3 border-b border-line text-left last:border-0 hover:bg-surface-muted">
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft"><Icon icon={icon} tone="primary" /></span>
      <span><span className="block font-medium">{label}</span><span className="block text-small text-ink-soft">{hint}</span></span>
    </button>
  );

  return (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void handle(e.target)} data-testid="doc-camera" />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => void handle(e.target)} data-testid="doc-file" />
      <Modal open={open} title={title} onClose={onClose}>
        <Option icon={Camera} label="Take a photo" hint="Use the camera" onClick={() => cameraRef.current?.click()} />
        <Option icon={FolderOpen} label="Choose a file" hint="Photo library, files or PDF" onClick={() => fileRef.current?.click()} />
      </Modal>
    </>
  );
}
