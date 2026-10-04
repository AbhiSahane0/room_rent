import { Banknote, Building2, ChartColumn, CircleHelp, House, LogOut, MapPin, Menu, Receipt, Settings, Users, WifiOff, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ConfirmDialog, Icon } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/utils/cn';
import { PropertySwitcher } from './PropertySwitcher';

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }
export const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/rooms', label: 'Rooms', icon: Building2 },
  { to: '/tenants', label: 'Tenants', icon: Users },
  { to: '/bills', label: 'Bills', icon: Receipt },
  { to: '/payments', label: 'Payments', icon: Banknote },
  { to: '/reports', label: 'Reports', icon: ChartColumn },
  { to: '/properties', label: 'Properties', icon: MapPin },
];
export const SECONDARY_NAV: NavItem[] = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/help', label: 'Help', icon: CircleHelp },
];
const TABS: NavItem[] = [MAIN_NAV[0], MAIN_NAV[1], MAIN_NAV[2], MAIN_NAV[3], { to: '/more', label: 'More', icon: Menu }];

function useLogout() {
  const { logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialog = (
    <ConfirmDialog open={confirming} title="Log out?" message="You will need to sign in again to use the app." confirmLabel="Log out" destructive loading={busy} onConfirm={async () => { setBusy(true); await logout(); }} onCancel={() => setConfirming(false)} />
  );
  return { ask: () => setConfirming(true), dialog };
}

export function LogoutButton({ className }: { className?: string }) {
  const { ask, dialog } = useLogout();
  return (
    <>
      <button type="button" onClick={ask} className={className}><Icon icon={LogOut} tone="danger" /><span className="font-medium text-danger">Logout</span></button>
      {dialog}
    </>
  );
}

const sideLink = ({ isActive }: { isActive: boolean }) => cn('flex h-11 items-center gap-3 rounded-md px-3 font-medium', isActive ? 'bg-primary-soft text-primary font-semibold' : 'text-ink-soft hover:bg-surface-muted');

function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 lg:flex">
      <div className="mb-5 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary"><Icon icon={Building2} tone="white" /></div>
        <div className="min-w-0"><div className="text-heading">Rent Manager</div><PropertySwitcher className="text-small" /></div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Main">
        {MAIN_NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={sideLink}>{({ isActive }) => (<><Icon icon={n.icon} tone={isActive ? 'primary' : 'soft'} />{n.label}</>)}</NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-line pt-3">
        {SECONDARY_NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={sideLink}>{({ isActive }) => (<><Icon icon={n.icon} tone={isActive ? 'primary' : 'soft'} />{n.label}</>)}</NavLink>
        ))}
        <LogoutButton className="flex h-11 w-full items-center gap-3 rounded-md px-3 hover:bg-danger-soft" />
      </div>
    </aside>
  );
}

function BottomNav() {
  const { pathname } = useLocation();
  const moreActive = ['/more', '/payments', '/reports', '/properties', '/settings', '/help'].some((p) => pathname.startsWith(p));
  return (
    <nav className="pb-safe z-30 flex shrink-0 border-t border-line bg-surface lg:hidden" aria-label="Main">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className="flex h-16 flex-1 flex-col items-center justify-center gap-1 text-caption font-medium">
          {({ isActive }) => {
            const active = t.to === '/more' ? moreActive : isActive;
            return (
              <>
                <span className={cn('flex h-8 w-14 items-center justify-center rounded-full', active && 'bg-primary-soft')}><Icon icon={t.icon} tone={active ? 'primary' : 'muted'} /></span>
                <span className={active ? 'text-primary' : 'text-ink-muted'}>{t.label}</span>
              </>
            );
          }}
        </NavLink>
      ))}
    </nav>
  );
}

function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  if (online) return null;
  return <div role="status" className="pt-safe flex items-center justify-center gap-2 bg-ink-soft py-1.5 text-caption text-white"><Icon icon={WifiOff} size={14} tone="white" />No internet connection</div>;
}

/** Sidebar on laptops, bottom tabs on phones and tablets. */
export function AppShell() {
  const { pathname } = useLocation();
  useEffect(() => { document.getElementById('main')?.scrollTo({ top: 0 }); }, [pathname]);
  return (
    <div className="flex h-full bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <main id="main" className="pt-safe flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1100px] px-4 pb-10 pt-4 lg:px-8 lg:pt-8"><Outlet /></div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
