'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { RequirePermission, PageHeader } from '@/components/shell/page-guard';
import { FilterPanel } from '@/components/cves/filter-panel';
import { ResultCard } from '@/components/cves/result-card';
import { Button, SearchInput, Select, Skeleton, StateBlock } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { useCveSearch, type CveQueryParams } from '@/features/cves/hooks';
import { useDebounced } from '@/lib/use-debounced';
import { useI18n, type MessageKey } from '@/i18n';
import { api } from '@/lib/api';
import { formatDate, formatNumber, formatTime } from '@/lib/format';
import { PERMISSIONS as P } from '@/lib/permissions';
import { activeFilterCount, cvssFromSeverities, dateWindow, knownSeverities, noCveFilters, type CveFilters, type DatePreset } from '@/lib/cve-filters';
import { SEVERITY_BY_LEVEL } from '@/lib/severity';
import type { CveListItem, SyncState } from '@/lib/types';

const SORTS: CveQueryParams['sort'][] = ['published', 'modified', 'cvss', 'epss'];

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

function Explorer() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const urlParams = useSearchParams();
  const initialQ = urlParams.get('q') ?? '';
  const canAssets = can(P.ASSET_READ);
  // Deep links (e.g. from the dashboard): ?kev=1 &severity=critical,high &published=7d &vendor=fortinet
  const fromLink = (): CveFilters => ({
    ...noCveFilters(),
    cvss: cvssFromSeverities(knownSeverities((urlParams.get('severity') ?? '').split(','))),
    kev: urlParams.get('kev') === '1',
    date: { preset: (['7d', '30d', '90d', '12m'] as DatePreset[]).find((p) => p === urlParams.get('published')) ?? 'any', from: '', to: '' },
    vendorProduct: urlParams.get('vendor') ?? '',
    mine: canAssets && urlParams.get('assets') === 'mine',
  });
  const linkKey = `${urlParams.get('kev')}|${urlParams.get('severity')}|${urlParams.get('published')}|${urlParams.get('vendor') ?? ''}|${urlParams.get('assets')}`;

  const [q, setQ] = useState(initialQ);
  const [filters, setFilters] = useState<CveFilters>(fromLink);
  const [sort, setSort] = useState<CveQueryParams['sort']>('published');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  // The header search (?q=) and dashboard links can change while this page stays mounted.
  useEffect(() => setQ(initialQ), [initialQ]);
  useEffect(() => {
    setFilters(fromLink());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkKey]);

  const dq = useDebounced(q.trim());
  const dvp = useDebounced(filters.vendorProduct.trim());
  const [vendor, product] = dvp.includes(':') ? [dvp.split(':')[0]!, dvp.split(':').slice(1).join(':')] : [dvp, ''];
  // A preset's "now" is taken when it is picked, so the query key stays stable between renders.
  const window = useMemo(() => dateWindow(filters.date), [filters.date]);
  const [cvssMin, cvssMax] = filters.cvss;

  const params: CveQueryParams = {
    sort,
    order,
    assetCounts: canAssets,
    ...(dq ? { q: dq } : {}),
    ...(cvssMin > 0 ? { cvssMin } : {}),
    ...(cvssMax < 10 ? { cvssMax } : {}),
    ...(filters.kev ? { kev: true } : {}),
    ...(filters.epss > 0 ? { epssMin: filters.epss / 100 } : {}),
    ...(window.from ? { publishedFrom: window.from } : {}),
    ...(window.to ? { publishedTo: window.to } : {}),
    ...(vendor ? { vendor } : {}),
    ...(vendor && product ? { product } : {}),
    ...(canAssets && filters.mine ? { assets: 'affecting' as const } : {}),
    ...(canAssets && filters.mine && filters.exposed ? { assetExposed: true } : {}),
    ...(canAssets && filters.mine && filters.env ? { assetEnv: filters.env } : {}),
  };

  const query = useCveSearch(params);
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

  const filtersActive = activeFilterCount(filters, window) > 0;
  const clearFilters = () => setFilters(noCveFilters());
  const needsVendor = !!product && !vendor;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] min-w-0 grow flex-col gap-5 p-4 md:p-8">
      <PageHeader
        title={t('cves.title')}
        subtitle={
          <>
            {t('cves.subtitle')}
          </>
        }
        actions={<Button icon="copy" onClick={() => exportCsv(items)} disabled={items.length === 0}>{t('common.exportCsv')}</Button>}
      />

      <SearchInput size="lg" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('cves.searchPlaceholder')} />

      <FilterPanel filters={filters} onChange={setFilters} canAssets={canAssets} vendorError={needsVendor} windowActive={!!(window.from || window.to)} />

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
