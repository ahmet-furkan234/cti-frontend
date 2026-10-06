'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { RequirePermission, PageHeader } from '@/components/shell/page-guard';
import { FilterDrawer, type Published } from '@/components/cves/filter-drawer';
import { ResultCard } from '@/components/cves/result-card';
import { Button, SearchInput, Select, Skeleton, StateBlock, Tag, cx } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { useCveSearch, useCveStats, type CveQueryParams } from '@/features/cves/hooks';
import { useDebounced } from '@/lib/use-debounced';
import { useI18n, type MessageKey } from '@/i18n';
import { api } from '@/lib/api';
import { formatDate, formatNumber, formatTime } from '@/lib/format';
import { PERMISSIONS as P } from '@/lib/permissions';
import { SEVERITY_BY_LEVEL, SEVERITIES, type Severity } from '@/lib/severity';
import type { CveListItem, SyncState } from '@/lib/types';

const PUBLISHED_DAYS: Record<Exclude<Published, 'any'>, number> = { '7d': 7, '30d': 30, '12m': 365 };
const SORTS: CveQueryParams['sort'][] = ['published', 'modified', 'cvss', 'epss'];
const QUICK_SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low'];
const SEV_DOT: Record<Severity, string> = { critical: 'bg-critical', high: 'bg-high', medium: 'bg-medium', low: 'bg-low', none: 'bg-neutral' };

function csvCell(v: string | number | boolean): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv(rows: CveListItem[]) {
  const head = ['cve', 'cvss', 'severity', 'epss', 'kev', 'published', 'description'];
  const lines = rows.map((r) => [r.id, r.cvssScore, (SEVERITY_BY_LEVEL[r.cvssSeverity] ?? 'none'), r.epss, r.isKev, r.published, r.description].map(csvCell).join(','));
  const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cves-${formatDate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx('inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[15px] font-medium transition-colors', on ? 'border-transparent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink-muted hover:text-ink')}
    >
      {children}
    </button>
  );
}

function Explorer() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const urlParams = useSearchParams();
  const initialQ = urlParams.get('q') ?? '';
  // Deep links (e.g. from the dashboard): ?kev=1 &severity=critical,high &published=7d &vendor=fortinet
  const linkSeverities = (urlParams.get('severity') ?? '').split(',').filter((x): x is Severity => (SEVERITIES as string[]).includes(x));
  const linkPublished = (['7d', '30d', '12m'] as const).find((p) => p === urlParams.get('published')) ?? 'any';
  const linkKey = `${urlParams.get('kev')}|${linkSeverities.join(',')}|${linkPublished}|${urlParams.get('vendor') ?? ''}`;

  const [q, setQ] = useState(initialQ);
  const [severities, setSeverities] = useState<Severity[]>(linkSeverities);
  const [cvss, setCvss] = useState<[number, number]>([0, 10]);
  const [kev, setKev] = useState(urlParams.get('kev') === '1');
  const [epss, setEpss] = useState('');
  const [published, setPublished] = useState<Published>(linkPublished);
  const [vendorProduct, setVendorProduct] = useState(urlParams.get('vendor') ?? '');
  const [sort, setSort] = useState<CveQueryParams['sort']>('published');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [drawer, setDrawer] = useState(false);

  // The header search (?q=) and dashboard links can change while this page stays mounted.
  useEffect(() => setQ(initialQ), [initialQ]);
  useEffect(() => {
    setSeverities(linkSeverities);
    setKev(urlParams.get('kev') === '1');
    setPublished(linkPublished);
    setVendorProduct(urlParams.get('vendor') ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkKey]);

  const dq = useDebounced(q.trim());
  const dvp = useDebounced(vendorProduct.trim());
  const [vendor, product] = dvp.includes(':') ? [dvp.split(':')[0]!, dvp.split(':').slice(1).join(':')] : [dvp, ''];
  const epssValue = epss.trim() === '' ? undefined : Number(epss.replace(',', '.')) / 100;
  const epssMin = epssValue !== undefined && Number.isFinite(epssValue) ? Math.min(1, Math.max(0, epssValue)) : undefined;
  const publishedFrom = useMemo(
    () => (published === 'any' ? undefined : new Date(Date.now() - PUBLISHED_DAYS[published] * 86_400_000).toISOString()),
    [published],
  );

  const params: CveQueryParams = {
    sort,
    order,
    ...(dq ? { q: dq } : {}),
    ...(severities.length ? { severity: severities } : {}),
    ...(cvss[0] > 0 ? { cvssMin: cvss[0] } : {}),
    ...(cvss[1] < 10 ? { cvssMax: cvss[1] } : {}),
    ...(kev ? { kev: true } : {}),
    ...(epssMin !== undefined && epssMin > 0 ? { epssMin } : {}),
    ...(publishedFrom ? { publishedFrom } : {}),
    ...(vendor ? { vendor } : {}),
    ...(vendor && product ? { product } : {}),
  };

  const query = useCveSearch(params);
  const stats = useCveStats(can(P.DASHBOARD_VIEW));
  const sync = useQuery({ queryKey: ['sync'], queryFn: () => api<SyncState[]>('/sync'), enabled: can(P.SYNC_VIEW) });
  const nvdUpdated = sync.data?.find((s) => s.source === 'nvd')?.lastSuccessAt;

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const first = query.data?.pages[0];
  const total = first?.total;

  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sevCount = (s: Severity) => stats.data?.severityDistribution.find((d) => SEVERITY_BY_LEVEL[d.severity] === s)?.count;
  const advancedCount = (cvss[0] > 0 || cvss[1] < 10 ? 1 : 0) + ((epssMin ?? 0) > 0 ? 1 : 0) + (published !== 'any' ? 1 : 0) + (dvp ? 1 : 0);
  const filtersActive = severities.length > 0 || kev || advancedCount > 0;
  const clearFilters = () => {
    setSeverities([]);
    setCvss([0, 10]);
    setKev(false);
    setEpss('');
    setPublished('any');
    setVendorProduct('');
  };
  const needsVendor = !!product && !vendor;
  const toggleSeverity = (s: Severity) => setSeverities((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <div className="mx-auto flex w-full max-w-[1100px] min-w-0 grow flex-col gap-5 p-4 md:p-8">
      <PageHeader
        title={t('cves.title')}
        subtitle={
          <>
            {t('cves.subtitle')}
            <span className="mt-0.5 block text-sm text-ink-subtle">
              {t('cves.sources')}
              {nvdUpdated ? ` · ${t('cves.updated', { time: formatTime(nvdUpdated) })}` : ''}
            </span>
          </>
        }
        actions={<Button icon="copy" onClick={() => exportCsv(items)} disabled={items.length === 0}>{t('common.exportCsv')}</Button>}
      />

      <SearchInput size="lg" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('cves.searchPlaceholder')} />

      <div className="flex flex-col gap-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label={t('cves.filters')}>
          {QUICK_SEVERITIES.map((s) => (
            <Chip key={s} on={severities.includes(s)} onClick={() => toggleSeverity(s)}>
              <span className={cx('size-2.5 rounded-full', severities.includes(s) ? 'bg-on-accent' : SEV_DOT[s])} aria-hidden="true" />
              {t(`sev.${s}` as MessageKey)}
              {sevCount(s) !== undefined ? <span className="text-sm tabular-nums opacity-70">{formatNumber(sevCount(s)!, locale)}</span> : null}
            </Chip>
          ))}
          <Chip on={kev} onClick={() => setKev((v) => !v)}>{t('cves.quick.kev')}</Chip>
          <Chip on={published === '7d'} onClick={() => setPublished((p) => (p === '7d' ? 'any' : '7d'))}>{t('cves.quick.week')}</Chip>
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-dashed border-line-strong px-4 text-[15px] font-medium text-ink-muted hover:text-ink"
          >
            {advancedCount > 0 ? t('cves.moreN', { n: advancedCount }) : t('cves.more')}
          </button>
        </div>

        {advancedCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {cvss[0] > 0 || cvss[1] < 10 ? <Tag tone="accent" onRemove={() => setCvss([0, 10])}>{t('cves.tag.cvss', { min: cvss[0].toFixed(1), max: cvss[1].toFixed(1) })}</Tag> : null}
            {(epssMin ?? 0) > 0 ? <Tag tone="accent" onRemove={() => setEpss('')}>{t('cves.tag.epss', { v: epss })}</Tag> : null}
            {published !== 'any' && published !== '7d' ? <Tag tone="accent" onRemove={() => setPublished('any')}>{t('cves.tag.published', { v: t(`cves.f.pub.${published}` as MessageKey) })}</Tag> : null}
            {dvp ? <Tag tone="accent" onRemove={() => setVendorProduct('')}>{dvp}</Tag> : null}
          </div>
        ) : null}
      </div>

      <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-card" aria-busy={query.isPending}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3 md:px-5">
          <div className="grow">
            <span className="text-[15px] font-semibold">{first ? (total !== undefined ? t('cves.results', { n: formatNumber(total, locale) }) : t('cves.resultsMs', { ms: first.tookMs })) : ' '}</span>
            {first && total !== undefined ? <span className="ml-2 text-sm text-ink-subtle">{t('cves.resultsMs', { ms: first.tookMs })}</span> : null}
          </div>
          {filtersActive ? <Button size="sm" variant="ghost" onClick={clearFilters}>{t('common.clearFilters')}</Button> : null}
          <span className="text-sm text-ink-muted">{t('cves.sort')}</span>
          <Select
            size="sm"
            aria-label={t('cves.sort')}
            value={sort ?? ''}
            onChange={(v) => setSort(v as CveQueryParams['sort'])}
            options={SORTS.map((s) => ({ value: s, label: t(`cves.sort.${s}` as MessageKey) }))}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
            aria-label={t(order === 'desc' ? 'cves.sort.desc' : 'cves.sort.asc')}
            title={t(order === 'desc' ? 'cves.sort.desc' : 'cves.sort.asc')}
            icon={order === 'desc' ? 'down' : 'up'}
          />
        </div>

        {query.isPending ? (
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex gap-4 border-b border-line px-5 py-4 last:border-b-0">
              <Skeleton width={72} height={72} />
              <div className="grow"><Skeleton lines={3} height={12} /></div>
            </div>
          ))
        ) : query.isError ? (
          <StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={() => void query.refetch()}>{t('common.retry')}</Button>} />
        ) : items.length === 0 ? (
          filtersActive || dq ? (
            <StateBlock kind="no-results" title={t('cves.empty.title')} description={t('cves.empty.desc')} action={filtersActive ? <Button onClick={clearFilters}>{t('common.clearFilters')}</Button> : undefined} />
          ) : (
            <StateBlock kind="empty" title={t('cves.noDb.title')} description={t('cves.noDb.desc')} />
          )
        ) : (
          items.map((r) => <ResultCard key={r.id} item={r} query={dq} />)
        )}

        {items.length > 0 ? (
          <div className="flex items-center gap-3 px-5 py-3.5 text-sm text-ink-subtle">
            {isFetchingNextPage ? <Skeleton width={200} height={10} /> : null}
            <span className="grow" />
            <span>
              {hasNextPage
                ? t('cves.loadMore', { n: formatNumber(items.length, locale), total: total !== undefined ? ` / ${formatNumber(total, locale)}` : '' })
                : t('cves.allLoaded', { n: formatNumber(items.length, locale) })}
            </span>
          </div>
        ) : null}
        <div ref={sentinel} className="h-px" />
      </section>

      {drawer ? (
        <FilterDrawer
          cvss={cvss} onCvss={setCvss}
          epss={epss} onEpss={setEpss}
          published={published} onPublished={setPublished}
          vendorProduct={vendorProduct} onVendorProduct={setVendorProduct}
          vendorError={needsVendor}
          canClear={advancedCount > 0}
          onClear={() => { setCvss([0, 10]); setEpss(''); setPublished('any'); setVendorProduct(''); }}
          onClose={() => setDrawer(false)}
        />
      ) : null}
    </div>
  );
}

export default function CvesPage() {
  return (
    <RequirePermission any={[P.CVE_READ]}>
      <Suspense>
        <Explorer />
      </Suspense>
    </RequirePermission>
  );
}
