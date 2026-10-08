'use client';

import { type ReactNode, useState } from 'react';
import { RangeSlider } from '@/components/cves/range-slider';
import { Button, Icon, Select, Switch, Tag, cx } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { CVSS_BANDS, bandOf } from '@/lib/cve-filters';
import { activeVulnFilterCount, noVulnFilters, type StatusFilter, type VulnFilters } from '@/lib/vulns';

const STATUSES: StatusFilter[] = ['all', 'open', 'in_progress', 'mitigated', 'accepted'];
const STATUS_KEY: Record<StatusFilter, MessageKey> = { all: 'common.all', open: 'status.open', in_progress: 'status.in_progress', mitigated: 'status.mitigated', accepted: 'vulns.tab.accepted' };
const ENVS = ['prod', 'staging', 'dev'];
const EPSS = [0, 10, 50, 80];
const BAND_DOT: Record<string, string> = { low: 'bg-low', medium: 'bg-medium', high: 'bg-high', critical: 'bg-critical' };

function Block({ title, children }: { title: string; children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-3"><h3 className="m-0 text-[15px] font-semibold text-ink">{title}</h3>{children}</div>;
}

function Option({ on, onClick, children, dot }: { on: boolean; onClick: () => void; children: ReactNode; dot?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cx('inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-[15px] font-medium transition-colors', on ? 'border-transparent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink-muted hover:text-ink')}>
      {dot ? <span className={cx('size-2.5 rounded-full', on ? 'bg-on-accent' : dot)} aria-hidden="true" /> : null}{children}
    </button>
  );
}

function StatusOption({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        'flex min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        on ? 'bg-accent text-on-accent shadow-sm' : 'text-ink-muted hover:bg-surface hover:text-ink',
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span className={cx('shrink-0 rounded-md px-1.5 py-0.5 text-xs tabular-nums', on ? 'bg-white/15 text-on-accent' : 'bg-surface-3 text-ink-subtle')}>{count}</span>
    </button>
  );
}

export function VulnFilterPanel({ filters, onChange, counts }: { filters: VulnFilters; onChange: (next: VulnFilters) => void; counts: Record<StatusFilter, number> }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<VulnFilters>) => onChange({ ...filters, ...patch });
  const count = activeVulnFilterCount(filters);
  const band = bandOf(filters.cvss);
  const [min, max] = filters.cvss;
  const tags: { key: string; label: string; remove: () => void }[] = [];
  if (filters.status !== 'all') tags.push({ key: 'status', label: t(STATUS_KEY[filters.status]), remove: () => set({ status: 'all' }) });
  if (band) tags.push({ key: 'cvss', label: `CVSS ${t(`cves.fp.band.${band}` as MessageKey)}`, remove: () => set({ cvss: [0, 10] }) });
  else if (min > 0 || max < 10) tags.push({ key: 'cvss', label: `CVSS ${min.toFixed(1)}–${max.toFixed(1)}`, remove: () => set({ cvss: [0, 10] }) });
  if (filters.kev || filters.epss > 0) tags.push({ key: 'threat', label: [filters.kev ? 'CISA KEV' : '', filters.epss > 0 ? `EPSS ≥ %${filters.epss}` : ''].filter(Boolean).join(' · '), remove: () => set({ kev: false, epss: 0 }) });
  if (filters.env || filters.exposed) tags.push({ key: 'asset', label: [filters.env || '', filters.exposed ? t('vulns.f.exposed') : ''].filter(Boolean).join(' · '), remove: () => set({ env: '', exposed: false }) });

  return (
    <section className="min-w-0 rounded-xl border border-line bg-surface shadow-card" aria-label={t('vulns.filters')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <Button size="sm" icon="filter" variant={open ? 'secondary' : 'ghost'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>{t('vulns.filters')}{count ? <span className="ml-1 rounded-full bg-accent px-2 text-xs text-on-accent">{count}</span> : null}</Button>
        {!open ? tags.length ? <div className="flex min-w-0 flex-wrap gap-1.5">{tags.map((x) => <Tag key={x.key} tone="accent" onRemove={x.remove}>{x.label}</Tag>)}</div> : <span className="text-sm text-ink-subtle">{t('vulns.filters.none')}</span> : null}
        <span className="grow" />
        {count ? <Button size="sm" variant="ghost" onClick={() => onChange({ ...noVulnFilters(), q: filters.q })}>{t('common.clearFilters')}</Button> : null}
        <Button size="sm" variant="ghost" aria-label={t(open ? 'common.close' : 'vulns.filters')} onClick={() => setOpen((v) => !v)}><Icon name={open ? 'up' : 'down'} size={16} /></Button>
      </div>
      {open ? <div className="grid grid-cols-1 gap-x-10 gap-y-7 border-t border-line px-5 py-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <Block title={t('vulns.tabs.label')}>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 sm:grid-cols-5" role="group" aria-label={t('vulns.tabs.label')}>
              {STATUSES.map((s) => <StatusOption key={s} on={filters.status === s} onClick={() => set({ status: s })} label={t(STATUS_KEY[s])} count={counts[s]} />)}
            </div>
          </Block>
        </div>
        <Block title={t('vulns.f.cvss')}>
          <div className="flex flex-wrap gap-2">{CVSS_BANDS.map((b) => <Option key={b.id} on={band === b.id} dot={BAND_DOT[b.id]} onClick={() => set({ cvss: band === b.id ? [0, 10] : b.range })}>{t(`cves.fp.band.${b.id}` as MessageKey)}</Option>)}</div>
          <RangeSlider min={0} max={10} value={filters.cvss} onChange={(cvss) => set({ cvss })} labelMin={t('cves.fp.cvssMin')} labelMax={t('cves.fp.cvssMax')} />
          <div className="flex justify-between text-sm font-medium tabular-nums"><span>{min.toFixed(1)}</span><span>{max.toFixed(1)}</span></div>
        </Block>
        <Block title={t('vulns.f.threat')}>
          <Switch checked={filters.kev} onChange={(kev) => set({ kev })} label="CISA KEV" hint={t('vulns.f.kev.hint')} />
          <div className="flex flex-col gap-2"><span className="text-sm text-ink-muted">{t('vulns.f.epss')}</span><div className="flex flex-wrap gap-2">{EPSS.map((v) => <Option key={v} on={filters.epss === v} onClick={() => set({ epss: v })}>{v === 0 ? t('common.all') : `≥ %${v}`}</Option>)}</div></div>
        </Block>
        <Block title={t('vulns.f.asset')}>
          <Select aria-label={t('vulns.f.env')} value={filters.env} onChange={(env) => set({ env })} options={[{ value: '', label: t('vulns.f.envAll') }, ...ENVS.map((env) => ({ value: env, label: t(`env.${env}` as MessageKey) }))]} />
          <Switch checked={filters.exposed} onChange={(exposed) => set({ exposed })} label={t('vulns.f.exposed')} />
        </Block>
      </div> : null}
    </section>
  );
}
