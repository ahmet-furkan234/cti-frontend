'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { PageHeader } from '@/components/shell/page-guard';
import { Icon } from '@/components/ui';
import { useRoles, useUsers } from '@/features/admin/hooks';
import { useT } from '@/i18n';
import { ApiError } from '@/lib/api';
import { PERMISSIONS as P } from '@/lib/permissions';

/** Users / Roles switch shown on both admin pages (only the tabs the user may open). */
export function AdminTabs() {
  const t = useT();
  const pathname = usePathname();
  const { can } = useAuth();
  const users = useUsers({ page: 1, pageSize: 1 }, can(P.USER_READ));
  const roles = useRoles(can(P.ROLE_READ));
  const tabs = [
    { href: '/admin/users', label: t('admin.tab.users'), count: users.data?.total, show: can(P.USER_READ), active: pathname.startsWith('/admin/users') },
    { href: '/admin/roles', label: t('admin.tab.roles'), count: roles.data?.length, show: can(P.ROLE_READ), active: pathname.startsWith('/admin/roles') },
  ].filter((x) => x.show);
  return (
    <div className="flex gap-6 overflow-x-auto border-b border-line" role="tablist" aria-label={t('admin.tabs.label')}>
      {tabs.map((x) => (
        <Link key={x.href} href={x.href} role="tab" aria-selected={x.active} className={`relative inline-flex h-11 items-center gap-2 text-[15px] font-medium no-underline ${x.active ? 'text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent' : 'text-ink-muted hover:text-ink'}`}>
          {x.label}
          {x.count != null ? <span className="rounded-full bg-surface-2 px-2 text-xs font-medium text-ink-muted">{x.count}</span> : null}
        </Link>
      ))}
    </div>
  );
}

/** Same title and tabs on the users and roles pages; only the action button changes. */
export function AdminHeader({ subtitle, actions }: { subtitle?: ReactNode; actions?: ReactNode }) {
  const t = useT();
  return (
    <>
      <PageHeader title={t('users.title')} subtitle={subtitle ?? t('users.subtitle')} actions={actions} />
      <AdminTabs />
    </>
  );
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** Right drawer by default; `centered` turns it into a dialog-style modal. */
export function Drawer({ title, onClose, children, wide, medium, centered, hideScrollbar, footer }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; medium?: boolean; centered?: boolean; hideScrollbar?: boolean; footer?: ReactNode }) {
  const t = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className={`fixed inset-0 z-30 flex bg-black/40 ${centered ? 'items-center justify-center p-4' : 'justify-end'}`} onClick={onClose} role="presentation">
      <aside className={`flex max-w-full flex-col ${wide ? 'w-[720px]' : medium ? 'w-[560px]' : 'w-[440px]'} bg-surface shadow-pop ${centered ? `${medium ? 'max-h-[76vh]' : 'max-h-[calc(100dvh-2rem)]'} rounded-2xl border border-line` : 'h-full'}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold grow">{title}</h2>
          <button type="button" className="inline-flex size-9 items-center justify-center rounded-lg text-ink-subtle hover:bg-surface-2 hover:text-ink" onClick={onClose} aria-label={t('common.close')}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className={`flex min-h-0 grow flex-col gap-4 overflow-y-auto px-6 pb-6 ${hideScrollbar ? '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : ''}`}>{children}</div>
        {footer ? <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line bg-surface px-6 py-4">{footer}</div> : null}
      </aside>
    </div>
  );
}
