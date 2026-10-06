'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { StateBlock, buttonClass } from '@/components/ui';
import { useT } from '@/i18n';

/** Renders children only when the user holds at least one of the permissions; otherwise a 403 block. */
export function RequirePermission({ any, children }: { any: string[]; children: ReactNode }) {
  const { can } = useAuth();
  const t = useT();
  if (any.length > 0 && !can(...any)) {
    return (
      <div className="mx-auto flex w-full max-w-[1440px] min-w-0 grow flex-col gap-5 p-4 md:p-8">
        <div className="min-w-0 rounded-xl border border-line bg-surface shadow-card">
          <StateBlock
            kind="forbidden"
            code="403"
            title={t('common.noPermission')}
            description={t('common.noPermissionDesc')}
            action={<Link href="/" className={buttonClass()}>{t('common.goHome')}</Link>}
          />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  mono,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="grow min-w-0">
        <h1 className={mono ? 'text-2xl leading-8 font-semibold tracking-tight font-mono' : 'text-2xl leading-8 font-semibold tracking-tight'}>{title}</h1>
        {subtitle ? <div className="mt-0.5 text-[15px] text-ink-muted">{subtitle}</div> : null}
      </div>
      {actions}
    </div>
  );
}
