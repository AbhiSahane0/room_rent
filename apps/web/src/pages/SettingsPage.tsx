import { useQuery } from '@tanstack/react-query';
import { Building2, ChevronRight, Info, ReceiptText, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Avatar, Card, Icon, SectionHeader } from '@/components/ui';
import { ExportButton } from '@/features/exports/ExportButton';
import { LogoutButton } from '@/components/layout/AppShell';
import { Page } from '@/components/layout/Page';
import { useProperty } from '@/features/properties/PropertyProvider';

function Row({ icon, label, hint, to, last }: { icon: LucideIcon; label: string; hint?: string; to?: string; last?: boolean }) {
  const body = (
    <>
      <span className="mr-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft"><Icon icon={icon} tone="primary" /></span>
      <span className="min-w-0 flex-1"><span className="block font-medium">{label}</span>{hint ? <span className="block truncate text-small text-ink-soft">{hint}</span> : null}</span>
      {to ? <Icon icon={ChevronRight} tone="muted" /> : null}
    </>
  );
  const cls = `flex min-h-14 items-center px-4 py-2 ${last ? '' : 'border-b border-line'}`;
  return to ? <Link to={to} className={`${cls} hover:bg-surface-muted`}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function SettingsPage() {
  const { current } = useProperty();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<{ id: string; username: string }>('/auth/me') });
  return (
    <Page title="Settings">
      <Card className="flex items-center gap-3">
        <Avatar name={me.data?.username ?? 'Owner'} size={52} />
        <div><div className="text-heading">{me.data?.username ?? ' '}</div><div className="text-small text-ink-soft">Owner account</div></div>
      </Card>
      <SectionHeader title="Account" />
      <Card padded={false} className="overflow-hidden"><Row icon={ShieldCheck} label="Profile & Security" hint="Change your username or password" to="/settings/security" last /></Card>
      <SectionHeader title="Property" />
      <Card padded={false} className="overflow-hidden">
        <Row icon={Building2} label="Property Settings" hint={current ? `${current.name}, ${current.city}` : 'Add a property first'} to={current ? `/properties/${current.id}/edit` : '/properties/new'} />
        <Row icon={ReceiptText} label="Bill Settings" hint={current ? `Prefix ${current.billPrefix}, due on day ${current.dueDayOfMonth}` : 'Prefix, due day, electricity rate'} to={current ? '/settings/bill' : undefined} />
        <Row icon={Building2} label="All Properties" to="/properties" last />
      </Card>
      <SectionHeader title="Your data" />
      <Card className="space-y-3">
        <p className="text-ink-soft">Download everything in one Excel file: rooms, tenants and what they owe, every bill and payment, electricity readings and a month-by-month summary. Open it in Excel, Google Sheets or Numbers.</p>
        <ExportButton />
      </Card>
      <SectionHeader title="App" />
      <Card padded={false} className="overflow-hidden"><Row icon={Info} label="About" hint="Rent Manager · Web" last /></Card>
      <Card padded={false} className="mt-6"><LogoutButton className="flex min-h-14 w-full items-center gap-3 px-4 hover:bg-danger-soft" /></Card>
    </Page>
  );
}
