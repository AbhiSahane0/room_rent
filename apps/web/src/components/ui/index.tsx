import { CloudOff, TriangleAlert, X, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import {
  forwardRef, useEffect, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { ApiError, NetworkError } from '@/api/client';
import { cn } from '@/utils/cn';
import { formatYM, shiftMonth } from '@/utils/format';

/* ---------- Icon ---------- */
export type Tone = 'ink' | 'soft' | 'muted' | 'primary' | 'danger' | 'success' | 'warning' | 'white';
const toneText: Record<Tone, string> = { ink: 'text-ink', soft: 'text-ink-soft', muted: 'text-ink-muted', primary: 'text-primary', danger: 'text-danger', success: 'text-success', warning: 'text-warning', white: 'text-white' };
export const toneClass = (t: Tone) => toneText[t];

/** Every icon goes through here so size and stroke width stay consistent. */
export function Icon({ icon: Glyph, size = 20, tone = 'soft', className }: { icon: LucideIcon; size?: number; tone?: Tone; className?: string }) {
  return <Glyph size={size} strokeWidth={1.75} className={cn('shrink-0', !className?.includes('text-current') && toneText[tone], className)} aria-hidden />;
}

/* ---------- Button ---------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-dark disabled:bg-disabled disabled:text-disabled-fg',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-surface-muted',
  ghost: 'text-primary hover:bg-surface-muted',
  danger: 'bg-danger-soft text-danger hover:opacity-80',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: LucideIcon;
  loading?: boolean;
  full?: boolean;
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent', className)} role="status" aria-label="Loading" />;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', size = 'md', icon, loading, full = true, className, children, disabled, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn('inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70', size === 'md' ? 'h-12 px-4 text-body' : 'h-9 px-3 text-small', full ? 'w-full' : 'w-auto', variants[variant], className)}
      {...rest}
    >
      {loading ? <Spinner /> : icon ? <Icon icon={icon} size={size === 'md' ? 20 : 16} tone="ink" className="text-current" /> : null}
      {children}
    </button>
  );
});

/** A router link styled like a button. */
export function LinkButton({ to, variant = 'primary', icon, children, className, full = true, size = 'md', ...rest }: LinkProps & { variant?: Variant; icon?: LucideIcon; full?: boolean; size?: 'md' | 'sm' }) {
  return (
    <Link to={to} className={cn('inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors', size === 'md' ? 'h-12 px-4 text-body' : 'h-9 px-3 text-small', full ? 'w-full' : 'w-auto', variants[variant], className)} {...rest}>
      {icon ? <Icon icon={icon} size={size === 'md' ? 20 : 16} className="text-current" /> : null}
      {children}
    </Link>
  );
}

/* ---------- Card ---------- */
export function Card({ children, className, padded = true, to, onClick }: { children: ReactNode; className?: string; padded?: boolean; to?: string; onClick?: () => void }) {
  const cls = cn('block rounded-lg border border-line bg-surface text-left', padded && 'p-4', (to || onClick) && 'transition-colors hover:bg-surface-muted', className);
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cn(cls, 'w-full')}>{children}</button>;
  return <div className={cls}>{children}</div>;
}

/* ---------- Form fields ---------- */
interface FieldShellProps { label?: string; error?: string; hint?: string; children: ReactNode; className?: string; htmlFor?: string }
export function Field({ label, error, hint, children, className, htmlFor }: FieldShellProps) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      {label ? <label htmlFor={htmlFor} className="block text-small font-semibold text-ink-soft">{label}</label> : null}
      {children}
      {error ? <p className="text-small text-danger" role="alert">{error}</p> : hint ? <p className="text-small text-ink-muted">{hint}</p> : null}
    </div>
  );
}

const control = (error?: string) => cn('w-full min-w-0 rounded-md border bg-surface px-3 text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none disabled:bg-surface-muted', error ? 'border-danger' : 'border-line-strong');

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> { label?: string; error?: string; hint?: string; prefix?: string; icon?: LucideIcon; containerClassName?: string }
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, hint, prefix, icon, containerClassName, className, id, ...rest }, ref) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Field label={label} error={error} hint={hint} htmlFor={fieldId} className={containerClassName}>
      <div className="relative flex items-center">
        {icon ? <Icon icon={icon} tone="muted" className="pointer-events-none absolute left-3" /> : null}
        {prefix ? <span className="pointer-events-none absolute left-3 text-ink-soft">{prefix}</span> : null}
        <input ref={ref} id={fieldId} aria-invalid={!!error} className={cn(control(error), 'h-12', (icon || prefix) && 'pl-10', prefix && 'pl-8', className)} {...rest} />
      </div>
    </Field>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string; hint?: string }>(function Textarea({ label, error, hint, className, id, ...rest }, ref) {
  const auto = useId();
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id ?? auto}>
      <textarea ref={ref} id={id ?? auto} rows={3} aria-invalid={!!error} className={cn(control(error), 'min-h-24 py-3', className)} {...rest} />
    </Field>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; hint?: string; options: { value: string; label: string }[]; placeholder?: string }>(function Select({ label, error, hint, options, placeholder, className, id, ...rest }, ref) {
  const auto = useId();
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id ?? auto}>
      <select ref={ref} id={id ?? auto} aria-invalid={!!error} className={cn(control(error), 'h-12', className)} {...rest}>
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
});

export const MoneyInput = forwardRef<HTMLInputElement, Omit<InputProps, 'prefix' | 'inputMode'>>(function MoneyInput(props, ref) {
  return <Input ref={ref} prefix="₹" inputMode="decimal" placeholder="0" {...props} />;
});

export const DateInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(function DateInput(props, ref) {
  return <Input ref={ref} type="date" {...props} />;
});

/* ---------- Display ---------- */
export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'primary';
const badgeBg: Record<BadgeTone, string> = { success: 'bg-success-soft text-success', warning: 'bg-warning-soft text-warning', danger: 'bg-danger-soft text-danger', neutral: 'bg-surface-muted text-ink-soft', primary: 'bg-primary-soft text-primary' };
const badgeDot: Record<BadgeTone, string> = { success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', neutral: 'bg-ink-muted', primary: 'bg-primary' };
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-caption font-semibold', badgeBg[tone])}>
      <span className={cn('h-1.5 w-1.5 rounded-full', badgeDot[tone])} />
      {label}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-line', className)} />;
}
export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border border-line bg-surface p-4">
          <Skeleton className="h-5 w-2/5" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-3/5" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, message, action }: { icon: LucideIcon; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft"><Icon icon={icon} size={32} tone="primary" /></div>
      <h2 className="text-heading">{title}</h2>
      <p className="mb-6 mt-1.5 max-w-sm text-ink-soft">{message}</p>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const offline = error instanceof NetworkError;
  const message = offline ? 'Please check your internet connection and try again.' : error instanceof ApiError && error.status < 500 && error.status !== 401 ? error.message : 'Please try again in a moment.';
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center" role="alert">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-danger-soft"><Icon icon={offline ? CloudOff : TriangleAlert} size={32} tone="danger" /></div>
      <h2 className="text-heading">{offline ? 'You appear to be offline' : 'Something went wrong'}</h2>
      <p className="mb-6 mt-1.5 max-w-sm text-ink-soft">{message}</p>
      {onRetry ? <Button variant="secondary" full={false} className="px-8" onClick={onRetry}>Retry</Button> : null}
    </div>
  );
}

export function ProgressBar({ value, light = true }: { value: number; light?: boolean }) {
  return (
    <div className={cn('h-2 overflow-hidden rounded-full', light ? 'bg-white/25' : 'bg-line')}>
      <div className={cn('h-2 rounded-full', light ? 'bg-white' : 'bg-primary')} style={{ width: `${Math.max(0, Math.min(1, value || 0)) * 100}%` }} />
    </div>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between">
      <h2 className="text-heading">{title}</h2>
      {action}
    </div>
  );
}

export function StatCard({ value, label, icon, to }: { value: string; label: string; icon?: LucideIcon; to?: string }) {
  return (
    <Card to={to} className="flex-1 space-y-2">
      {icon ? <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft"><Icon icon={icon} tone="primary" /></div> : null}
      <div className="text-display">{value}</div>
      <div className="text-small text-ink-soft">{label}</div>
    </Card>
  );
}

export function DetailRow({ label, value, strong, tone, last }: { label: string; value: ReactNode; strong?: boolean; tone?: 'danger' | 'success'; last?: boolean }) {
  return (
    <div className={cn('flex min-h-11 items-center justify-between gap-4 py-2.5', !last && 'border-b border-line')}>
      <span className="text-small text-ink-soft">{label}</span>
      <span className={cn('text-right', strong ? 'text-heading' : 'font-medium', tone === 'danger' && 'text-danger', tone === 'success' && 'text-success')}>{value}</span>
    </div>
  );
}

export function Chip({ label, selected, onClick }: { label: string; selected?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={!!selected} className={cn('h-9 shrink-0 rounded-full border px-3.5 text-small font-medium transition-colors', selected ? 'border-primary bg-primary text-white' : 'border-line-strong bg-surface text-ink-soft hover:bg-surface-muted')}>
      {label}
    </button>
  );
}
export const ChipRow = ({ children }: { children: ReactNode }) => <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">{children}</div>;

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-md bg-surface-muted p-1" role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)} className={cn('h-10 flex-1 rounded-sm text-small font-medium', o.value === value ? 'bg-surface font-semibold text-ink shadow-sm' : 'text-ink-soft')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function MonthStepper({ value, onChange, label }: { value: string; onChange: (ym: string) => void; label?: string }) {
  return (
    <Field label={label}>
      <div className="flex h-12 items-center justify-between rounded-md border border-line-strong bg-surface px-1">
        <button type="button" aria-label="Previous month" onClick={() => onChange(shiftMonth(value, -1))} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-muted"><Icon icon={ChevronLeft} tone="ink" /></button>
        <span className="font-medium">{formatYM(value)}</span>
        <button type="button" aria-label="Next month" onClick={() => onChange(shiftMonth(value, 1))} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-muted"><Icon icon={ChevronRight} tone="ink" /></button>
      </div>
    </Field>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return <div className="flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</div>;
}

/* ---------- Dialogs ---------- */
/** Bottom sheet on phones, centred dialog on larger screens. Closes on Escape and outside click. */
export function Modal({ open, title, onClose, children, footer }: { open: boolean; title?: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="pb-safe flex max-h-[88vh] w-full flex-col rounded-t-xl bg-surface shadow-xl sm:max-w-md sm:rounded-xl">
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-heading">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-muted"><Icon icon={X} tone="ink" /></button>
        </div>
        <div className="overflow-y-auto px-5 pb-4">{children}</div>
        {footer ? <div className="px-5 pb-5">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', destructive, loading, onConfirm, onCancel }: { open: boolean; title: string; message?: string; confirmLabel?: string; destructive?: boolean; loading?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal open={open} title={title} onClose={loading ? () => undefined : onCancel}>
      {message ? <p className="text-ink-soft">{message}</p> : null}
      <div className="mt-5 flex gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

export function Notice({ tone, children }: { tone: 'danger' | 'success' | 'warning'; children: ReactNode }) {
  const cls = { danger: 'bg-danger-soft text-danger', success: 'bg-success-soft text-success', warning: 'bg-warning-soft text-warning' }[tone];
  return <div className={cn('rounded-md px-3 py-2.5 text-small', cls)} role={tone === 'danger' ? 'alert' : 'status'}>{children}</div>;
}

