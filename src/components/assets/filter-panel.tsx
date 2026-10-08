'use client';

import { useState } from 'react';
import { Button, Icon, Select, Switch, Tag, cx } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { noFilters, type AssetFilters } from '@/lib/assets';
import type { AssetTab } from '@/lib/types';

const TABS: AssetTab[] = ['all', 'srv', 'ep', 'net', 'ctr', 'cld'];
const ENVS = ['prod', 'staging', 'dev', 'corp'] as const;
const CRITS = ['critical', 'high', 'medium', 'low'] as const;

function TypeOption({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: string; count: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cx('flex min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', on ? 'bg-accent text-on-accent shadow-sm' : 'text-ink-muted hover:bg-surface hover:text-ink')}>
      <span className="truncate">{label}</span>
      <span className={cx('shrink-0 rounded-md px-1.5 py-0.5 text-xs tabular-nums', on ? 'bg-white/15 text-on-accent' : 'bg-surface-3 text-ink-subtle')}>{count}</span>
    </button>
  );
}

export function AssetFilterPanel({ filters, tab, onFiltersChange, onTabChange, counts, formatCount }: {
  filters: AssetFilters;
  tab: AssetTab;
  onFiltersChange: (next: AssetFilters) => void;
  onTabChange: (next: AssetTab) => void;
  counts: Record<AssetTab, number>;
  formatCount: (n: number) => string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<AssetFilters>) => onFiltersChange({ ...filters, ...patch });
  const count = (tab !== 'all' ? 1 : 0) + (filters.env ? 1 : 0) + (filters.crit ? 1 : 0) + (filters.exposedOnly ? 1 : 0) + (filters.criticalVulns ? 1 : 0) + (filters.staleOnly ? 1 : 0);
  const clear = () => { onFiltersChange({ ...noFilters(), q: filters.q }); onTabChange('all'); };
  const tags: { key: string; label: string; remove: () => void }[] = [];
  if (tab !== 'all') tags.push({ key: 'type', label: t(`assets.tab.${tab}` as MessageKey), remove: () => onTabChange('all') });
  if (filters.env) tags.push({ key: 'env', label: t(`env.${filters.env}` as MessageKey), remove: () => set({ env: '' }) });
  if (filters.crit) tags.push({ key: 'crit', label: t(`sev.${filters.crit}` as MessageKey), remove: () => set({ crit: '' }) });
  if (filters.exposedOnly) tags.push({ key: 'exposed', label: t('assets.tile.internet'), remove: () => set({ exposedOnly: false }) });
  if (filters.criticalVulns) tags.push({ key: 'vuln', label: t('assets.tile.vuln'), remove: () => set({ criticalVulns: false }) });
  if (filters.staleOnly) tags.push({ key: 'stale', label: t('assets.tile.stale'), remove: () => set({ staleOnly: false }) });

  return (
    <section className="min-w-0 rounded-xl border border-line bg-surface shadow-card" aria-label={t('assets.filters')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <Button size="sm" icon="filter" variant={open ? 'secondary' : 'ghost'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {t('assets.filters')}{count ? <span className="ml-1 rounded-full bg-accent px-2 text-xs tabular-nums text-on-accent">{count}</span> : null}
        </Button>
        {!open ? tags.length ? <div className="flex min-w-0 flex-wrap gap-1.5">{tags.map((tag) => <Tag key={tag.key} tone="accent" onRemove={tag.remove}>{tag.label}</Tag>)}</div> : <span className="text-sm text-ink-subtle">{t('assets.filters.none')}</span> : null}
        <span className="grow" />
        {count ? <Button size="sm" variant="ghost" onClick={clear}>{t('common.clearFilters')}</Button> : null}
        <Button size="sm" variant="ghost" aria-label={t(open ? 'common.close' : 'assets.filters')} onClick={() => setOpen((value) => !value)}><Icon name={open ? 'up' : 'down'} size={16} /></Button>
      </div>

      {open ? <div className="grid grid-cols-1 gap-x-10 gap-y-7 border-t border-line px-5 py-6 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3 md:col-span-2">
          <h3 className="text-balance text-[15px] font-semibold">{t('assets.tabs.label')}</h3>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 sm:grid-cols-3 lg:grid-cols-6" role="group" aria-label={t('assets.tabs.label')}>
            {TABS.map((id) => <TypeOption key={id} on={tab === id} onClick={() => onTabChange(id)} label={t(`assets.tab.${id}` as MessageKey)} count={formatCount(counts[id])} />)}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="text-balance text-[15px] font-semibold">{t('assets.filters.context')}</h3>
          <Select aria-label={t('assets.f.env')} value={filters.env} onChange={(env) => set({ env })} options={[{ value: '', label: t('assets.f.envAll') }, ...ENVS.map((env) => ({ value: env, label: t(`env.${env}` as MessageKey) }))]} />
          <Select aria-label={t('assets.f.crit')} value={filters.crit} onChange={(crit) => set({ crit: crit as AssetFilters['crit'] })} options={[{ value: '', label: t('assets.f.critAll') }, ...CRITS.map((crit) => ({ value: crit, label: t(`sev.${crit}` as MessageKey) }))]} />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="text-balance text-[15px] font-semibold">{t('assets.filters.condition')}</h3>
          <Switch checked={filters.exposedOnly} onChange={(exposedOnly) => set({ exposedOnly })} label={t('assets.tile.internet')} />
          <Switch checked={filters.criticalVulns} onChange={(criticalVulns) => set({ criticalVulns })} label={t('assets.tile.vuln')} />
          <Switch checked={filters.staleOnly} onChange={(staleOnly) => set({ staleOnly })} label={t('assets.tile.stale')} />
        </div>
      </div> : null}
    </section>
  );
}
