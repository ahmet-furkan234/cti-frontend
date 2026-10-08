'use client';

import Link from 'next/link';
import { StateBlock } from '@/components/ui';
import { LoadError, LoadingRows } from '@/components/shell/query-state';
import { useIocAssets } from '@/features/intel/hooks';
import { useI18n, type MessageKey } from '@/i18n';

/** Inventory assets an indicator points at, each linking to the asset. */
export function IocAssets({ id }: { id: string }) {
  const { t } = useI18n();
  const q = useIocAssets(id, true);
  if (q.isError) return <LoadError onRetry={() => void q.refetch()} />;
  if (q.isPending) return <LoadingRows rows={1} />;
  const items = q.data.items;
  if (items.length === 0) return <StateBlock kind="empty" compact title={t('intel.ioc.noAssets')} />;
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {items.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line py-2.5 first:border-t-0">
          <Link href={`/assets/${a.id}`} className="font-medium">{a.name}</Link>
          <span className="text-sm text-ink-muted">{[a.addr, t(`env.${a.env}` as MessageKey), a.exposed ? t('vulns.exposed') : null].filter(Boolean).join(' · ')}</span>
          <span className="grow" />
          <span className={a.openVulns > 0 ? 'text-sm font-medium text-high-ink' : 'text-sm text-ink-subtle'}>{t('intel.ioc.openVulns', { n: a.openVulns })}</span>
        </li>
      ))}
    </ul>
  );
}
