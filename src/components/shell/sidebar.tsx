'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { useT, type MessageKey } from '@/i18n';
import { PERMISSIONS as P } from '@/lib/permissions';
import { initials } from '@/lib/format';
import { BrandMark } from './brand';

interface NavEntry {
  id: string;
  href: string;
  icon: IconName;
  label: MessageKey;
  /** any-of; omitted = visible to every signed-in user */
  needs?: string[];
}

const MAIN: NavEntry[] = [
  { id: 'dashboard', href: '/', icon: 'dashboard', label: 'nav.dashboard', needs: [P.DASHBOARD_VIEW] },
  { id: 'cves', href: '/cves', icon: 'search', label: 'nav.cves', needs: [P.CVE_READ] },
  { id: 'assets', href: '/assets', icon: 'assets', label: 'nav.assets' },
  { id: 'vulns', href: '/vulns', icon: 'alert', label: 'nav.vulns' },
  { id: 'intel', href: '/intel', icon: 'intel', label: 'nav.intel' },
  { id: 'alerts', href: '/alerts', icon: 'bell', label: 'nav.alerts' },
  { id: 'reports', href: '/reports', icon: 'report', label: 'nav.reports' },
];

const ADMIN: NavEntry[] = [
  { id: 'users', href: '/admin/users', icon: 'users', label: 'nav.users', needs: [P.USER_READ, P.ROLE_READ] },
  { id: 'audit', href: '/admin/audit', icon: 'audit', label: 'nav.audit', needs: [P.AUDIT_READ] },
  { id: 'sync', href: '/admin/sync', icon: 'sync', label: 'nav.sync', needs: [P.SYNC_VIEW] },
  { id: 'settings', href: '/admin/settings', icon: 'settings', label: 'nav.settings' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/admin/users') return pathname.startsWith('/admin/users') || pathname.startsWith('/admin/roles');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const t = useT();
  const pathname = usePathname();
  const { user, can, logout } = useAuth();

  const render = (items: NavEntry[]) =>
    items
      .filter((it) => !it.needs || can(...it.needs))
      .map((it) => {
        // Users & roles: land on whichever tab the user may see.
        const href = it.id === 'users' && !can(P.USER_READ) ? '/admin/roles' : it.href;
        return (
          <Link key={it.id} href={href} className={`nav-item${isActive(pathname, it.href) ? ' is-active' : ''}`} onClick={onNavigate} aria-current={isActive(pathname, it.href) ? 'page' : undefined}>
            <Icon name={it.icon} size={16} />
            <span className="grow">{t(it.label)}</span>
          </Link>
        );
      });

  const admin = render(ADMIN);

  return (
    <nav aria-label={t('nav.main')} className={`sidebar${open ? ' is-open' : ''}`}>
      <div className="sidebar__brand">
        <BrandMark />
        <span style={{ fontSize: 16, lineHeight: '24px', fontWeight: 600 }}>{t('app.name')}</span>
      </div>
      <div className="sidebar__nav">
        {render(MAIN)}
        {admin.length > 0 ? (
          <>
            <div className="caps nav-group subtle">{t('nav.admin')}</div>
            {admin}
          </>
        ) : null}
      </div>
      {user ? (
        <div className="sidebar__user">
          <span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{initials(user.name)}</span>
          <div className="col min0 grow">
            <span className="ellipsis" style={{ fontSize: 13, lineHeight: '18px', fontWeight: 500 }}>{user.name}</span>
            <span className="ellipsis muted" style={{ fontSize: 11, lineHeight: '16px' }}>{user.roles.map((r) => r.name).join(', ') || user.email}</span>
          </div>
          <button type="button" className="icon-btn" onClick={() => void logout()} title={t('shell.logout')} aria-label={t('shell.logout')}>
            <Icon name="logout" size={15} />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
