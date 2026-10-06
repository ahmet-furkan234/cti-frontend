'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Skeleton, StateBlock, buttonClass } from '@/components/ui';
import { useT } from '@/i18n';
import { api } from '@/lib/api';

/** Loads `/auth/<endpoint>/:token` (public, token-gated) and renders the form only for a valid link. */
export function TokenGate({
  endpoint,
  children,
}: {
  endpoint: 'invitations' | 'reset-tokens';
  children: (info: { email: string; token: string }) => ReactNode;
}) {
  const t = useT();
  const token = useSearchParams().get('token') ?? '';
  const { data, isPending, isError } = useQuery({
    queryKey: ['auth-token', endpoint, token],
    queryFn: () => api<{ email: string }>(`/auth/${endpoint}/${encodeURIComponent(token)}`, { noRefresh: true }),
    enabled: token.length >= 20,
    retry: false,
  });

  if (token.length < 20 || isError) {
    return (
      <div className="flex w-full max-w-[420px] flex-col gap-5 rounded-2xl border border-line bg-surface p-8 shadow-card">
        <StateBlock
          kind="error"
          title={t('auth.linkInvalid.title')}
          description={t('auth.linkInvalid.text')}
          action={<Link href="/login" className={buttonClass()}>{t('auth.toLogin')}</Link>}
        />
      </div>
    );
  }
  if (isPending || !data) {
    return (
      <div className="flex w-full max-w-[420px] flex-col gap-5 rounded-2xl border border-line bg-surface p-8 shadow-card">
        <Skeleton lines={3} height={12} />
      </div>
    );
  }
  return <>{children({ email: data.email, token })}</>;
}
