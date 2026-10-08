'use client';

import { useState, type ReactNode } from 'react';
import { RangeSlider } from '@/components/cves/range-slider';
import { Button, Icon, Select, Switch, Tag, TextField, cx } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { CVSS_BANDS, DATE_PRESETS, activeFilterCount, bandOf, noCveFilters, type CveFilters, type DatePreset } from '@/lib/cve-filters';

const EPSS_STEPS: { value: number; label: MessageKey }[] = [
  { value: 0, label: 'cves.fp.epss.any' },
  { value: 10, label: 'cves.fp.epss.possible' },
  { value: 50, label: 'cves.fp.epss.likely' },
];
const ENVS = ['prod', 'staging', 'dev'];
const BAND_DOT: Record<string, string> = { low: 'bg-low', medium: 'bg-medium', high: 'bg-high', critical: 'bg-critical' };

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h3 className="m-0 text-[15px] font-semibold text-ink">{title}</h3>
      {children}
    </div>
  );
}

function Option({ on, onClick, children, dot }: { on: boolean; onClick: () => void; children: ReactNode; dot?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx('inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-[15px] font-medium transition-colors', on ? 'border-transparent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink-muted hover:text-ink')}
    >
      {dot ? <span className={cx('size-2.5 rounded-full', on ? 'bg-on-accent' : dot)} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/** Plain-language filters for the CVE list. Closed by default; what is selected stays visible as removable tags. */
export function FilterPanel({
  filters, onChange, canAssets, vendorError, windowActive,
}: {
  filters: CveFilters;
  onChange: (next: CveFilters) => void;
  canAssets: boolean;
  vendorError: boolean;
  /** a date window is in effect (the page computes it once) */
  windowActive: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const band = bandOf(filters.cvss);
  const customScore = !band && (filters.cvss[0] > 0 || filters.cvss[1] < 10);
  const [fine, setFine] = useState(customScore);
  const set = (patch: Partial<CveFilters>) => onChange({ ...filters, ...patch });
  const setDate = (patch: Partial<CveFilters['date']>) => set({ date: { ...filters.date, ...patch } });
  const count = activeFilterCount(filters, windowActive ? { from: 'x' } : {});
  const [min, max] = filters.cvss;

  const tags: { key: string; label: string; remove: () => void }[] = [];
  if (band) tags.push({ key: 'band', label: t(`cves.fp.band.${band}` as MessageKey), remove: () => set({ cvss: [0, 10] }) });
  else if (customScore) tags.push({ key: 'score', label: `${min.toFixed(1)} – ${max.toFixed(1)}`, remove: () => set({ cvss: [0, 10] }) });
  if (windowActive) {
    const d = filters.date;
    tags.push({
      key: 'date',
      label: d.preset === 'custom' ? `${d.from || '…'} – ${d.to || '…'}` : t(`cves.fp.pub.${d.preset}` as MessageKey),
      remove: () => setDate({ preset: 'any', from: '', to: '' }),
    });
  }
  if (filters.kev) tags.push({ key: 'kev', label: t('cves.quick.kev'), remove: () => set({ kev: false }) });
  if (filters.epss > 0) tags.push({ key: 'epss', label: `${t('cves.fp.epss')}: ${t(EPSS_STEPS.find((s) => s.value === filters.epss)?.label ?? 'cves.fp.epss.possible')}`, remove: () => set({ epss: 0 }) });
  if (filters.mine) tags.push({ key: 'mine', label: t('cves.fp.assets.mine'), remove: () => set({ mine: false, exposed: false, env: '' }) });
  if (filters.vendorProduct.trim()) tags.push({ key: 'vendor', label: filters.vendorProduct.trim(), remove: () => set({ vendorProduct: '' }) });

  return (
    <section className="min-w-0 rounded-xl border border-line bg-surface shadow-card" aria-label={t('cves.filters')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <Button size="sm" icon="filter" variant={open ? 'secondary' : 'ghost'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {t('cves.filters')}
          {count > 0 ? <span className="ml-1 rounded-full bg-accent px-2 text-xs font-medium text-on-accent">{count}</span> : null}
        </Button>
        {!open ? (
          tags.length > 0 ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {tags.map((x) => <Tag key={x.key} tone="accent" onRemove={x.remove}>{x.label}</Tag>)}
            </div>
          ) : (
            <span className="text-sm text-ink-subtle">{t('cves.fp.none')}</span>
          )
        ) : null}
        <span className="grow" />
        {count > 0 ? <Button size="sm" variant="ghost" onClick={() => onChange(noCveFilters())}>{t('common.clearFilters')}</Button> : null}
        <Button size="sm" variant="ghost" aria-label={t(open ? 'common.close' : 'cves.filters')} onClick={() => setOpen((o) => !o)}>
          <Icon name={open ? 'up' : 'down'} size={16} />
        </Button>
      </div>

      {open ? (
        <div className="grid grid-cols-1 gap-x-10 gap-y-7 border-t border-line px-5 py-6 md:grid-cols-2">
          {canAssets ? (
            <Block title={t('cves.fp.assets')}>
              <Switch checked={filters.mine} onChange={(v) => set(v ? { mine: true } : { mine: false, exposed: false, env: '' })} label={t('cves.fp.assets.mine')} hint={t('cves.fp.assets.hint')} />
              {filters.mine ? (
                <div className="flex flex-col gap-3 border-l-2 border-line pl-4">
                  <Switch checked={filters.exposed} onChange={(v) => set({ exposed: v })} label={t('cves.fp.assets.exposed')} />
                  <div className="flex max-w-xs flex-col gap-1.5">
                    <span className="text-sm text-ink-muted">{t('cves.fp.assets.env')}</span>
                    <Select
                      aria-label={t('cves.fp.assets.env')}
                      value={filters.env}
                      onChange={(v) => set({ env: v })}
                      options={[{ value: '', label: t('cves.fp.pub.any') }, ...ENVS.map((e) => ({ value: e, label: e }))]}
                    />
                  </div>
                </div>
              ) : null}
            </Block>
          ) : null}

          <Block title={t('cves.fp.cvss')}>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('cves.fp.cvss')}>
              {CVSS_BANDS.map((b) => (
                <Option key={b.id} on={band === b.id} dot={BAND_DOT[b.id]} onClick={() => set({ cvss: band === b.id ? [0, 10] : b.range })}>
                  {t(`cves.fp.band.${b.id}` as MessageKey)}
                </Option>
              ))}
            </div>
            <button type="button" className="w-fit border-0 bg-transparent p-0 text-sm font-medium text-accent hover:underline" aria-expanded={fine} onClick={() => setFine((f) => !f)}>
              {t('cves.fp.cvss.fine')}
            </button>
            {fine ? (
              <div className="flex flex-col gap-2">
                <RangeSlider min={0} max={10} value={filters.cvss} onChange={(v) => set({ cvss: v })} labelMin={t('cves.fp.cvssMin')} labelMax={t('cves.fp.cvssMax')} />
                <div className="flex items-center justify-between text-sm tabular-nums">
                  <span className="font-medium">{min.toFixed(1)}</span>
                  <span className="text-ink-subtle">{min === 0 && max === 10 ? t('cves.fp.cvss.any') : ''}</span>
                  <span className="font-medium">{max.toFixed(1)}</span>
                </div>
              </div>
            ) : null}
          </Block>

          <Block title={t('cves.fp.threat')}>
            <Switch checked={filters.kev} onChange={(v) => set({ kev: v })} label={t('cves.quick.kev')} hint={t('cves.fp.kev.hint')} />
            <div className="flex flex-col gap-2">
              <span className="text-sm text-ink-muted">{t('cves.fp.epss')}</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('cves.fp.epss')}>
                {EPSS_STEPS.map((s) => (
                  <Option key={s.value} on={filters.epss === s.value} onClick={() => set({ epss: s.value })}>{t(s.label)}</Option>
                ))}
              </div>
            </div>
          </Block>

          <Block title={t('cves.fp.date')}>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('cves.fp.date')}>
              {DATE_PRESETS.map((p: DatePreset) => (
                <Option key={p} on={filters.date.preset === p} onClick={() => setDate({ preset: p })}>{t(`cves.fp.pub.${p}` as MessageKey)}</Option>
              ))}
            </div>
            {filters.date.preset === 'custom' ? (
              <div className="grid max-w-md grid-cols-2 gap-2">
                <TextField label={t('cves.fp.from')} type="date" value={filters.date.from} max={filters.date.to || undefined} onChange={(e) => setDate({ from: e.target.value })} />
                <TextField label={t('cves.fp.to')} type="date" value={filters.date.to} min={filters.date.from || undefined} onChange={(e) => setDate({ to: e.target.value })} />
              </div>
            ) : null}
          </Block>

          <Block title={t('cves.f.vendor')}>
            <TextField
              aria-label={t('cves.f.vendor')}
              className="max-w-md"
              placeholder={t('cves.f.vendorPlaceholder')}
              value={filters.vendorProduct}
              onChange={(e) => set({ vendorProduct: e.target.value })}
              hint={vendorError ? undefined : t('cves.f.vendorHint')}
              error={vendorError ? t('cves.f.productNeedsVendor') : undefined}
            />
          </Block>
        </div>
      ) : null}
    </section>
  );
}
