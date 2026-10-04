import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui';
import { cn } from '@/utils/cn';

/** Page title row. `back` shows a back arrow (detail and form pages). Pages are narrow by default; `wide` for dashboards and grids. */
export function Page({ title, subtitle, back, actions, wide, children, className }: { title?: string; subtitle?: ReactNode; back?: boolean | string; actions?: ReactNode; wide?: boolean; children: ReactNode; className?: string }) {
  const navigate = useNavigate();
  return (
    <div className={cn('mx-auto w-full', wide ? 'max-w-[1100px]' : 'max-w-[720px]', className)}>
      {title ? (
        <header className="mb-4 flex items-start gap-2">
          {back ? (
            <button type="button" aria-label="Go back" onClick={() => (typeof back === 'string' ? navigate(back) : window.history.length > 1 ? navigate(-1) : navigate('/'))} className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-muted"><Icon icon={ArrowLeft} size={24} tone="ink" /></button>
          ) : null}
          <div className="min-w-0 flex-1 pt-1.5"><h1 className="truncate text-title">{title}</h1>{subtitle ? <div className="truncate text-small text-ink-soft">{subtitle}</div> : null}</div>
          {actions ? <div className="flex shrink-0 items-center gap-2 pt-0.5">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}
