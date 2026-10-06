'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { LoadError, LoadingRows } from '@/components/shell/query-state';
import { Banner, Button, Icon, RiskRing, SearchInput, Select, StateBlock, StatusPill, Tag, buttonClass, cx } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { useAssets } from '@/features/assets/hooks';
import { toAssetItem, type AssetItem } from '@/features/assets/map';
import { isFiltered, noFilters, vulnBreakdown, type SortKey } from '@/lib/assets';
import { formatNumber } from '@/lib/format';
import { useAgeMinutes } from '@/lib/use-age';
import { useDemo } from '@/lib/demo';
import { useAuth } from '@/components/auth-provider';
import { PERMISSIONS as P } from '@/lib/permissions';
import { ASSET_ICON } from '@/mocks/assets';
import type { AssetTab } from '@/lib/types';

const SORTS: SortKey[] = ['risk', 'seen', 'name'];
const ENVS = ['prod', 'staging', 'dev', 'corp'] as const;
const CRITS = ['critical', 'high', 'medium', 'low'] as const;
const VULN_TEXT = { critical: 'text-critical-ink', high: 'text-high-ink', medium: 'text-medium-ink', low: 'text-ink-muted' } as const;
const CRIT_DOT = { critical: 'bg-critical', high: 'bg-high', medium: 'bg-medium', low: 'bg-low' } as const;
const ROW_GRID = 'md:grid-cols-[minmax(0,1.7fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_130px_20px]';

function Tile({ label, sub, value, on, onClick, tone }: { label: string; sub: string; value: string; on?: boolean; onClick?: () => void; tone?: string }) {
  const body = (
    <>
      <span className="text-sm text-ink-muted">{label}</span>
      <span className={cx('text-3xl leading-9 font-semibold tabular-nums', tone)}>{value}</span>
      <span className="text-sm text-ink-subtle">{sub}</span>
    </>
  );
  const cls = 'flex min-w-0 flex-col gap-0.5 rounded-xl border bg-surface px-5 py-4 text-left shadow-card transition-colors';
  return onClick ? (
    <button type="button" aria-pressed={on} onClick={onClick} className={cx(cls, on ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong')}>{body}</button>
  ) : (
    <div className={cx(cls, 'border-line')}>{body}</div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cx('inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[15px] font-medium transition-colors', on ? 'border-transparent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink-muted hover:text-ink')}>
      {children}
    </button>
  );
}

function AssetRowCard({ r, open, onToggle, canEdit }: { r: AssetItem; open: boolean; onToggle: () => void; canEdit: boolean }) {
  const { t } = useI18n();
  const ageMin = useAgeMinutes();
  const vulns = vulnBreakdown(r.counts);
  return (
    <li className={cx('border-b border-line last:border-b-0', open && 'bg-surface-2/60')}>
      <button type="button" aria-expanded={open} onClick={onToggle} className={cx('grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-4 text-left hover:bg-surface-2 md:px-5', ROW_GRID)}>
        <span className="flex min-w-0 items-center gap-3">
          <span title={t(`assets.type.${r.type}` as MessageKey)} className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-muted"><Icon name={ASSET_ICON[r.type]} size={20} /></span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-semibold">{r.host}</span>
            <span className="truncate text-sm text-ink-muted"><span className="font-mono">{r.ip}</span> · {r.os}</span>
          </span>
        </span>
        <span className="order-3 col-span-2 flex flex-wrap items-center gap-1.5 md:order-none md:col-span-1">
          <Tag>{t(`env.${r.env}` as MessageKey)}</Tag>
          {r.exposed ? <Tag tone="exposed" icon="globe">{t('assets.internet')}</Tag> : null}
          {r.status !== 'active' ? <StatusPill status={r.status} /> : null}
        </span>
        <span className="order-4 col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm md:order-none md:col-span-1">
          {vulns.length === 0 ? <span className="text-ink-subtle">{t('assets.row.noVulns')}</span> : vulns.map((v) => <span key={v.level} className={cx('font-medium', VULN_TEXT[v.level])}>{t(`assets.vuln.${v.level}` as MessageKey, { n: v.n })}</span>)}
        </span>
        <span className="order-2 flex items-center gap-3 md:order-none">
          <RiskRing score={r.risk} size={40} />
          <span className="hidden text-sm text-ink-muted md:block">{ageMin(r.seenMin)}</span>
        </span>
        <Icon name="down" size={16} className={cx('hidden text-ink-subtle transition-transform md:block', open && 'rotate-180')} />
      </button>
      {open ? (
        <dl className="m-0 grid grid-cols-1 gap-x-8 gap-y-3 px-5 pb-5 text-[15px] sm:grid-cols-2 md:pl-[76px]">
          <div><dt className="text-sm text-ink-muted">{t('assets.d.os')}</dt><dd className="m-0">{r.os}</dd></div>
          <div><dt className="text-sm text-ink-muted">{t('assets.d.ip')}</dt><dd className="m-0 font-mono">{r.ip}</dd></div>
          <div><dt className="text-sm text-ink-muted">{t('assets.d.crit')}</dt><dd className="m-0 flex items-center gap-2"><span className={cx('size-2.5 rounded-full', CRIT_DOT[r.crit])} />{t(`sev.${r.crit}` as MessageKey)}</dd></div>
          <div><dt className="text-sm text-ink-muted">{t('assets.d.seen')}</dt><dd className="m-0">{ageMin(r.seenMin)}</dd></div>
          <div><dt className="text-sm text-ink-muted">{t('assets.d.source')}</dt><dd className="m-0">{r.source === 'manual' ? t('assets.src.manual') : r.source}</dd></div>
          <div><dt className="text-sm text-ink-muted">{t('assets.d.status')}</dt><dd className="m-0"><StatusPill status={r.status} /></dd></div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Link href="/vulns" className={buttonClass('secondary', 'sm')}>{t('assets.d.viewVulns')}</Link>
            {canEdit ? <Link href={`/assets/${r.id}`} className={buttonClass('secondary', 'sm')}>{t('assets.d.edit')}</Link> : null}
          </div>
        </dl>
      ) : null}
    </li>
  );
}

const TABS: AssetTab[] = ['all', 'srv', 'ep', 'net', 'ctr', 'cld'];

function Assets() {
  const { t, locale } = useI18n();
  const demo = useDemo();
  const { can } = useAuth();
  const [filters, setFilters] = useState(noFilters);
  const [tab, setTab] = useState<AssetTab>('all');
  const [sort, setSort] = useState<SortKey>('risk');
  const [open, setOpen] = useState<string | null>(null);
  const set = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...patch }));

  const query = useAssets({
    q: filters.q, tab, exposed: filters.exposedOnly, criticalVulns: filters.criticalVulns, stale: filters.staleOnly, env: filters.env, criticality: filters.crit, sort,
  });
  const pages = query.data?.pages ?? [];
  const rows = useMemo(() => pages.flatMap((p) => p.items).map(toAssetItem), [query.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const stats = pages[0]?.stats;
  const matches = pages[0]?.total ?? 0;
  const filtered = isFiltered({ ...filters, types: tab === 'all' ? null : [] });
  const reset = () => { setFilters(noFilters()); setTab('all'); };
  const total = stats?.total ?? 0;
  const tabCount = (id: AssetTab) => stats?.tabs[id] ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] min-w-0 grow flex-col gap-5 p-4 md:p-8">
      <PageHeader
        title={t('assets.title')}
        subtitle={stats ? t('assets.subtitle', { total: formatNumber(total, locale), active: formatNumber(stats.active, locale), stale: formatNumber(stats.stale, locale), archived: formatNumber(stats.archived, locale) }) : undefined}
        actions={
          <>
            {demo ? <Tag tone="accent">{t('common.demoData')}</Tag> : null}
            {can(P.ASSET_WRITE) ? <Link href="/assets/import" className={buttonClass()}>{t('assets.import')}</Link> : null}
            {can(P.ASSET_WRITE) ? <Link href="/assets/new" className={buttonClass('primary')}>{t('assets.add')}</Link> : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Tile label={t('assets.tile.all')} sub={t('assets.tile.all.sub')} value={formatNumber(total, locale)} on={!filtered} onClick={reset} />
        <Tile label={t('assets.tile.internet')} sub={t('assets.tile.internet.sub')} value={formatNumber(stats?.exposed ?? 0, locale)} on={filters.exposedOnly} onClick={() => set({ exposedOnly: !filters.exposedOnly })} tone="text-high-ink" />
        <Tile label={t('assets.tile.vuln')} sub={t('assets.tile.vuln.sub')} value={formatNumber(stats?.withCritical ?? 0, locale)} on={filters.criticalVulns} onClick={() => set({ criticalVulns: !filters.criticalVulns })} tone="text-critical-ink" />
        <Tile label={t('assets.tile.stale')} sub={t('assets.tile.stale.sub')} value={formatNumber(stats?.stale ?? 0, locale)} on={filters.staleOnly} onClick={() => set({ staleOnly: !filters.staleOnly })} />
      </div>

      <div className="flex flex-col gap-3">
        <SearchInput shortcut={null} className="w-full md:max-w-lg" placeholder={t('assets.searchPlaceholder')} value={filters.q} onChange={(e) => set({ q: e.target.value })} />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label={t('assets.tabs.label')}>
          {TABS.map((id) => (
            <Chip key={id} on={tab === id} onClick={() => setTab(id)}>
              {t(`assets.tab.${id}` as MessageKey)}
              <span className="text-sm tabular-nums opacity-70">{formatNumber(tabCount(id), locale)}</span>
            </Chip>
          ))}
        </div>
      </div>

      <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3 md:px-5">
          <div className="grow">
            <span className="text-[15px] font-semibold">{t('assets.results', { n: formatNumber(matches, locale) })}</span>
          </div>
          <Select size="sm" className="w-44" aria-label={t('assets.f.env')} value={filters.env} onChange={(v) => set({ env: v })} options={[{ value: '', label: t('assets.f.envAll') }, ...ENVS.map((e) => ({ value: e, label: t(`env.${e}` as MessageKey) }))]} />
          <Select size="sm" className="w-52" aria-label={t('assets.f.crit')} value={filters.crit} onChange={(v) => set({ crit: v as typeof filters.crit })} options={[{ value: '', label: t('assets.f.critAll') }, ...CRITS.map((c) => ({ value: c, label: t(`sev.${c}` as MessageKey) }))]} />
          <Select size="sm" className="w-48" aria-label={t('assets.sort.label')} value={sort} onChange={(v) => setSort(v as SortKey)} options={SORTS.map((s) => ({ value: s, label: t(`assets.sort.${s}` as MessageKey) }))} />
        </div>
        {query.isError ? (
          <LoadError onRetry={() => void query.refetch()} />
        ) : query.isPending ? (
          <LoadingRows />
        ) : rows.length === 0 ? (
          filtered ? (
            <StateBlock kind="no-results" title={t('assets.empty.title')} description={t('assets.empty.desc')} action={<Button onClick={reset}>{t('assets.clear')}</Button>} />
          ) : (
            <StateBlock kind="empty" title={t('assets.none.title')} description={t('assets.none.desc')} action={can(P.ASSET_WRITE) ? <Link href="/assets/new" className={buttonClass('primary')}>{t('assets.add')}</Link> : undefined} />
          )
        ) : (
          <>
            <ul className="m-0 list-none p-0">{rows.map((r) => <AssetRowCard key={r.id} canEdit={can(P.ASSET_WRITE)} r={r} open={open === r.id} onToggle={() => setOpen((o) => (o === r.id ? null : r.id))} />)}</ul>
            {query.hasNextPage ? (
              <div className="flex justify-center border-t border-line p-4">
                <Button loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{t('assets.more')}</Button>
              </div>
            ) : null}
          </>
        )}
      </section>
      {demo ? <Banner tone="info">{t('shell.demoBanner.text')}</Banner> : null}
    </div>
  );
}

export default function AssetsPage() {
  return (
    <RequirePermission any={[P.ASSET_READ]}>
      <Assets />
    </RequirePermission>
  );
}
