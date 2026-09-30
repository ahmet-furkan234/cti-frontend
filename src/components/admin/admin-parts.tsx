'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Icon } from '@/components/ui';
import { useT } from '@/i18n';
import { ApiError } from '@/lib/api';
import { PERMISSIONS as P } from '@/lib/permissions';

/** Users / Roles switch shown on both admin pages (only the tabs the user may open). */
export function AdminTabs() {
  const t = useT();
  const pathname = usePathname();
  const { can } = useAuth();
  const tabs = [
    { href: '/admin/users', label: t('admin.tab.users'), show: can(P.USER_READ), active: pathname.startsWith('/admin/users') },
    { href: '/admin/roles', label: t('admin.tab.roles'), show: can(P.ROLE_READ), active: pathname.startsWith('/admin/roles') },
  ].filter((x) => x.show);
  return (
    <div className="cti-tabs" role="tablist" aria-label={t('admin.tabs.label')}>
      {tabs.map((x) => (
        <Link key={x.href} href={x.href} role="tab" aria-selected={x.active} className={`cti-tab${x.active ? ' is-active' : ''}`}>
          {x.label}
        </Link>
      ))}
    </div>
  );
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** Simple modal-less right drawer. */
export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const t = useT();
  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h2 className="h2 grow">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}
