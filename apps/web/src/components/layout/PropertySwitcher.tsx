import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Icon, Modal } from '@/components/ui';
import { useProperty } from '@/features/properties/PropertyProvider';
import { cn } from '@/utils/cn';

/** Shows the active property. With several, tapping it opens a picker. */
export function PropertySwitcher({ className }: { className?: string }) {
  const { properties, current, setCurrentId } = useProperty();
  const [open, setOpen] = useState(false);
  if (!current) return null;
  if (properties.length < 2) return <span className={cn('truncate text-ink-soft font-medium', className)}>{current.name}</span>;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Switch property" className={cn('flex max-w-full items-center gap-1 text-ink-soft font-medium', className)}>
        <span className="truncate">{current.name}</span><Icon icon={ChevronDown} size={16} />
      </button>
      <Modal open={open} title="Switch property" onClose={() => setOpen(false)}>
        {properties.map((p) => (
          <button key={p.id} type="button" onClick={() => { setCurrentId(p.id); setOpen(false); }} className="flex min-h-14 w-full items-center justify-between border-b border-line text-left">
            <span><span className="block font-medium">{p.name}</span><span className="text-small text-ink-soft">{p.city}, {p.state}</span></span>
            {p.id === current.id ? <Icon icon={Check} tone="primary" /> : null}
          </button>
        ))}
      </Modal>
    </>
  );
}
