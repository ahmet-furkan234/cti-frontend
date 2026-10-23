'use client';

import { useState } from 'react';
import { useAssets } from '@/features/assets/hooks';
import { useI18n } from '@/i18n';
import { Banner, Button, Icon, SearchInput, cx } from '@/components/ui';

export function AlertAssetPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [labels, setLabels] = useState<Record<string, string>>({});
  const assets = useAssets({ q, tab: 'all', exposed: false, criticalVulns: false, stale: false, env: '', criticality: '', sort: 'name' });
  const items = assets.data?.pages.flatMap((p) => p.items) ?? [];
  const toggle = (id: string, name: string) => {
    setLabels((old) => ({ ...old, [id]: name }));
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };
  return <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface">
    <div className="border-b border-line p-3">
      <SearchInput shortcut={null} placeholder={t('alerts.assets.search')} value={q} onChange={(e) => setQ(e.target.value)} />
    </div>
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2/50 px-4 py-2">
      <span className="inline-flex items-center gap-2 text-xs font-medium" aria-live="polite"><Icon name="assets" size={14} />{t('alerts.assets.count', { n: value.length })}</span>
      {value.length > 0 ? <button type="button" onClick={() => onChange([])} className="rounded px-1 py-1 text-xs text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent">{t('alerts.assets.clear')}</button> : null}
    </div>
    {value.length > 0 ? <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto border-b border-line px-3 py-2" aria-label={t('alerts.assets.selected')}>
      {value.map((id) => {
        const name = labels[id] ?? items.find((a) => a.id === id)?.name ?? id;
        return <button key={id} type="button" title={name} onClick={() => onChange(value.filter((v) => v !== id))} className="inline-flex max-w-full items-center gap-2 rounded-md bg-accent-soft px-2 py-1 text-xs text-ink focus-visible:outline-2 focus-visible:outline-accent" aria-label={t('alerts.assets.remove', { name })}>
          <span className="max-w-44 truncate">{name}</span><Icon name="x" size={12} />
        </button>;
      })}
    </div> : null}
    {assets.isError ? <Banner tone="error" action={<Button onClick={() => void assets.refetch()}>{t('alerts.assets.retry')}</Button>}>{t('alerts.assets.error')}</Banner> : null}
    {assets.isPending ? <p role="status" className="p-6 text-center text-sm text-ink-muted">{t('alerts.assets.loading')}</p> : null}
    <div className="max-h-72 overflow-y-auto overscroll-contain" role="group" aria-label={t('alerts.assets.choose')} aria-busy={assets.isFetching}>
      {items.map((a) => <label key={a.id} className={cx('flex cursor-pointer items-center gap-3 border-b border-line px-4 py-3 transition-colors last:border-0 hover:bg-surface-2 focus-within:bg-surface-2', value.includes(a.id) && 'bg-accent-soft/60')}>
        <input type="checkbox" checked={value.includes(a.id)} disabled={!value.includes(a.id) && value.length >= 500} onChange={() => toggle(a.id, a.name)} className="size-4 shrink-0 accent-accent" />
        <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted sm:flex"><Icon name="server" size={17} /></span>
        <span className="min-w-0 grow"><span className="block truncate text-sm font-medium" title={a.name}>{a.name}</span><span className="mt-0.5 block truncate font-mono text-xs text-ink-muted" title={[a.addr, a.os].filter(Boolean).join(' · ')}>{[a.addr, a.os].filter(Boolean).join(' · ') || '—'}</span></span>
        <span className="max-w-20 shrink-0 truncate rounded-md bg-surface-2 px-2 py-1 text-[11px] text-ink-muted" title={a.env}>{a.env}</span>
      </label>)}
      {assets.isSuccess && items.length === 0 ? <p className="p-4 text-sm text-ink-muted">{t('alerts.assets.empty')}</p> : null}
    </div>
    {value.length >= 500 ? <p className="border-t border-line p-3 text-xs text-ink-muted" role="status">{t('alerts.assets.limit')}</p> : null}
    {assets.hasNextPage ? <div className="border-t border-line p-2"><Button variant="ghost" className="w-full" loading={assets.isFetchingNextPage} onClick={() => void assets.fetchNextPage()}>{t('alerts.assets.more')}</Button></div> : null}
  </div>;
}
