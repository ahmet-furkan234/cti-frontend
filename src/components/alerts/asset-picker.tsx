'use client';

import { useState } from 'react';
import { useAssets } from '@/features/assets/hooks';
import { useI18n } from '@/i18n';
import { Banner, Button, TextField, cx } from '@/components/ui';

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
  return <div className="flex flex-col gap-3">
    <TextField label={t('alerts.assets.search')} value={q} onChange={(e) => setQ(e.target.value)} />
    {value.length > 0 ? <div className="flex flex-wrap gap-2" aria-label={t('alerts.assets.selected')}>
      {value.map((id) => <button key={id} type="button" onClick={() => onChange(value.filter((v) => v !== id))} className="rounded-lg border border-accent bg-accent-soft px-3 py-1 text-sm" aria-label={t('alerts.assets.remove', { name: labels[id] ?? items.find((a) => a.id === id)?.name ?? id })}>
        {labels[id] ?? items.find((a) => a.id === id)?.name ?? id} ×
      </button>)}
    </div> : null}
    <p className="text-sm text-ink-muted" aria-live="polite">{t('alerts.assets.count', { n: value.length })}</p>
    {assets.isError ? <Banner tone="error" action={<Button onClick={() => void assets.refetch()}>{t('alerts.assets.retry')}</Button>}>{t('alerts.assets.error')}</Banner> : null}
    {assets.isPending ? <p role="status">{t('alerts.assets.loading')}</p> : null}
    <div className="max-h-64 overflow-y-auto rounded-xl border border-line" role="group" aria-label={t('alerts.assets.selected')}>
      {items.map((a) => <label key={a.id} className={cx('flex cursor-pointer items-center gap-3 border-b border-line p-3 last:border-0', value.includes(a.id) && 'bg-accent-soft')}>
        <input type="checkbox" checked={value.includes(a.id)} disabled={!value.includes(a.id) && value.length >= 500} onChange={() => toggle(a.id, a.name)} className="size-4 accent-accent" />
        <span className="min-w-0"><span className="block truncate font-medium">{a.name}</span><span className="block truncate text-sm text-ink-muted">{[a.addr, a.env, a.os].filter(Boolean).join(' · ')}</span></span>
      </label>)}
      {assets.isSuccess && items.length === 0 ? <p className="p-4 text-sm text-ink-muted">{t('alerts.assets.empty')}</p> : null}
    </div>
    {assets.hasNextPage ? <Button loading={assets.isFetchingNextPage} onClick={() => void assets.fetchNextPage()}>{t('alerts.assets.more')}</Button> : null}
  </div>;
}
