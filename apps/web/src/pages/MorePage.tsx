import { ChevronRight } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { Card, Icon } from '@/components/ui';
import { LogoutButton, MAIN_NAV, SECONDARY_NAV } from '@/components/layout/AppShell';
import { Page } from '@/components/layout/Page';

/** Phone-only menu (laptops have the sidebar). */
export function MorePage() {
  if (window.matchMedia('(min-width: 1024px)').matches) return <Navigate to="/" replace />;
  const items = [...MAIN_NAV.slice(4), ...SECONDARY_NAV];
  return (
    <Page title="More">
      <Card padded={false} className="overflow-hidden">
        {items.map((n, i) => (
          <Link key={n.to} to={n.to} className={`flex min-h-14 items-center px-4 hover:bg-surface-muted ${i < items.length - 1 ? 'border-b border-line' : ''}`}>
            <span className="mr-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft"><Icon icon={n.icon} tone="primary" /></span>
            <span className="flex-1 font-medium">{n.label}</span><Icon icon={ChevronRight} tone="muted" />
          </Link>
        ))}
      </Card>
      <Card padded={false} className="mt-4"><LogoutButton className="flex min-h-14 w-full items-center gap-3 px-4 hover:bg-danger-soft" /></Card>
    </Page>
  );
}
