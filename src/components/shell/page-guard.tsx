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
      <div className="page">
        <div className="card">
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
    <div className="page-head">
      <div className="grow min0">
        <h1 className={mono ? 'h1 h1--mono' : 'h1'}>{title}</h1>
        {subtitle ? <div className="sub">{subtitle}</div> : null}
      </div>
      {actions}
    </div>
  );
}
