'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, IconButton, type IconName } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { useT, type MessageKey } from '@/i18n';
import { PERMISSIONS as P } from '@/lib/permissions';
import { initials } from '@/lib/format';
import { BrandMark } from './brand';

export interface NavEntry {
  id: string;
  href: string;
  icon: IconName;
  label: MessageKey;
  /** any-of; omitted = visible to every signed-in user */
  needs?: string[];
  /** Global administration that must disappear while working inside a subsidiary. */
  platformOnly?: boolean;
}

export const MAIN: NavEntry[] = [
  { id: 'dashboard', href: '/', icon: 'dashboard', label: 'nav.dashboard', needs: [P.DASHBOARD_VIEW] },
  { id: 'cves', href: '/cves', icon: 'search', label: 'nav.cves', needs: [P.CVE_READ] },
  { id: 'assets', href: '/assets', icon: 'assets', label: 'nav.assets', needs: [P.ASSET_READ] },
  { id: 'vulns', href: '/vulns', icon: 'alert', label: 'nav.vulns', needs: [P.VULN_READ] },
  { id: 'intel', href: '/intel', icon: 'intel', label: 'nav.intel', needs: [P.INTEL_READ] },
  { id: 'alerts', href: '/alerts', icon: 'bell', label: 'nav.alerts', needs: [P.ALERT_READ] },
  { id: 'reports', href: '/reports', icon: 'report', label: 'nav.reports', needs: [P.REPORT_READ] },
  { id: 'settings', href: '/admin/settings', icon: 'settings', label: 'nav.settings' },
];

export const ADMIN: NavEntry[] = [
  { id: 'companies', href: '/admin/companies', icon: 'assets', label: 'nav.companies', needs: [P.COMPANY_READ, P.COMPANY_MANAGE] },
  { id: 'users', href: '/admin/users', icon: 'users', label: 'nav.users', needs: [P.USER_READ, P.ROLE_READ] },
  { id: 'audit', href: '/admin/audit', icon: 'audit', label: 'nav.audit', needs: [P.AUDIT_READ] },
  { id: 'sync', href: '/admin/sync', icon: 'sync', label: 'nav.sync', needs: [P.SYNC_VIEW], platformOnly: true },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/admin/users') return pathname.startsWith('/admin/users') || pathname.startsWith('/admin/roles');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const t = useT();
  const pathname = usePathname();
  const { user, can, logout, isPlatformScope } = useAuth();

  const render = (items: NavEntry[]) =>
    items
      .filter((it) => (!it.platformOnly || isPlatformScope) && (!it.needs || can(...it.needs)))
      .map((it) => {
        // Users & roles: land on whichever tab the user may see.
        const href = it.id === 'users' && !can(P.USER_READ) ? '/admin/roles' : it.href;
        const active = isActive(pathname, it.href);
        return (
          <Link
            key={it.id}
            href={href}
            className={`flex h-10 items-center gap-3 rounded-lg px-3 text-[15px] font-medium no-underline transition-colors ${
              active ? 'bg-accent-soft text-accent hover:text-accent' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
            }`}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
          >
            <Icon name={it.icon} size={18} />
            <span className="grow">{t(it.label)}</span>
          </Link>
        );
      });

  const admin = render(ADMIN);

  return (
    <nav
      aria-label={t('nav.main')}
      className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-line bg-surface transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
        open ? 'translate-x-0 shadow-pop' : '-translate-x-full'
      }`}
    >
      <div className="flex h-16 items-center gap-3 px-5">
        <BrandMark />
        <span className="text-lg font-semibold tracking-tight">{t('app.name')}</span>
      </div>
      <div className="flex grow flex-col gap-1 overflow-y-auto px-3 py-2">
        {render(MAIN)}
        {admin.length > 0 ? (
          <>
            <div className="mt-5 mb-1 px-3 text-sm font-medium text-ink-subtle">{t('nav.admin')}</div>
            {admin}
          </>
        ) : null}
      </div>
      {user ? (
        <div className="m-3 flex items-center gap-3 rounded-xl bg-surface-2 p-3">
          <Link href={`/admin/users/${user.id}`} className="flex min-w-0 grow items-center gap-3 rounded-lg" title={t('shell.myProfile')} aria-label={t('shell.myProfile')}>
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-on-accent">{initials(user.name)}</span>
            <div className="flex min-w-0 grow flex-col">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="truncate text-xs text-ink-muted">{user.roles.map((r) => r.name).join(', ') || user.email}</span>
            </div>
          </Link>
          <IconButton onClick={() => void logout()} title={t('shell.logout')} aria-label={t('shell.logout')}>
            <Icon name="logout" size={16} />
          </IconButton>
        </div>
      ) : null}
    </nav>
  );
}
