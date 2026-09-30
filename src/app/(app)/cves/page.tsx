'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { RequirePermission, PageHeader } from '@/components/shell/page-guard';
import { RangeSlider } from '@/components/cves/range-slider';
import { Button, Checkbox, EpssMeter, KevFlag, SearchInput, SeverityBadge, Skeleton, StateBlock, Tag, TextField } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { useCveSearch, useCveStats, type CveQueryParams } from '@/features/cves/hooks';
import { useI18n, type MessageKey } from '@/i18n';
import { api } from '@/lib/api';
import { formatDate, formatNumber, formatTime, highlightParts } from '@/lib/format';
import { PERMISSIONS as P } from '@/lib/permissions';
import { SEVERITY_BY_LEVEL, SEVERITIES, type Severity } from '@/lib/severity';
import type { CveListItem, SyncState } from '@/lib/types';

type Published = 'any' | '7d' | '30d' | '12m';
const PUBLISHED_DAYS: Record<Exclude<Published, 'any'>, number> = { '7d': 7, '30d': 30, '12m': 365 };
const SORTS: CveQueryParams['sort'][] = ['published', 'modified', 'cvss', 'epss'];
const COLS = '150px 130px 96px 44px minmax(0, 1fr) 96px';
const cols = (extra?: CSSProperties) => ({ '--cols': COLS, ...extra }) as CSSProperties;

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

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
  const initialQ = useSearchParams().get('q') ?? '';

  const [q, setQ] = useState(initialQ);
  const [severities, setSeverities] = useState<Severity[]>([]);
  const [cvss, setCvss] = useState<[number, number]>([0, 10]);
  const [kev, setKev] = useState(false);
  const [epss, setEpss] = useState('');
  const [published, setPublished] = useState<Published>('any');
  const [vendorProduct, setVendorProduct] = useState('');
  const [sort, setSort] = useState<CveQueryParams['sort']>('published');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  // The header search (?q=) can change while this page stays mounted.
  useEffect(() => setQ(initialQ), [initialQ]);

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
  const filtersActive = severities.length > 0 || cvss[0] > 0 || cvss[1] < 10 || kev || (epssMin ?? 0) > 0 || published !== 'any' || !!dvp;
  const clearFilters = () => {
    setSeverities([]);
    setCvss([0, 10]);
    setKev(false);
    setEpss('');
    setPublished('any');
    setVendorProduct('');
  };
  const needsVendor = !!product && !vendor;

  const searchMeta = first
    ? total !== undefined
      ? t('cves.resultsMeta', { n: formatNumber(total, locale), ms: first.tookMs })
      : t('cves.resultsMetaNoTotal', { ms: first.tookMs })
    : undefined;

  return (
    <div className="page">
      <PageHeader
        title={t('cves.title')}
        actions={
          <>
            <span className="sub">
              {t('cves.sources')}
              {nvdUpdated ? (
                <>
                  {' · '}
                  {t('cves.updated', { time: formatTime(nvdUpdated) })}
                </>
              ) : null}
            </span>
            <Button icon="copy" onClick={() => exportCsv(items)} disabled={items.length === 0}>
              {t('common.exportCsv')}
            </Button>
          </>
        }
      />
      <SearchInput size="lg" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('cves.searchPlaceholder')} meta={searchMeta} />

      <div className="split">
        <aside aria-label={t('cves.filters')} className="card card--pad col noshrink" style={{ width: 232, gap: 20 }}>
          <div className="col gap-8">
            <span className="caps">{t('cves.f.severity')}</span>
            {(['critical', 'high', 'medium', 'low'] as Severity[]).map((s) => (
              <label key={s} className="row" style={{ cursor: 'pointer' }}>
                <Checkbox checked={severities.includes(s)} onChange={(e) => setSeverities((cur) => (e.target.checked ? [...cur, s] : cur.filter((x) => x !== s)))} />
                <SeverityBadge severity={s} />
                <span className="grow" />
                <span className="mono-11 muted">{sevCount(s) !== undefined ? formatNumber(sevCount(s)!, locale) : ''}</span>
              </label>
            ))}
          </div>
          <div className="col gap-8">
            <span className="caps">{t('cves.f.cvss')}</span>
            <RangeSlider min={0} max={10} value={cvss} onChange={setCvss} labelMin={t('cves.f.cvssMin')} labelMax={t('cves.f.cvssMax')} />
            <div className="row mono-11 muted" style={{ justifyContent: 'space-between' }}>
              <span>{cvss[0].toFixed(1)}</span>
              <span>{cvss[1].toFixed(1)}</span>
            </div>
          </div>
          <label className="row">
            <Checkbox checked={kev} onChange={(e) => setKev(e.target.checked)} />
            <KevFlag />
            <span className="muted" style={{ fontSize: 12 }}>
              {t('cves.f.kevOnly')}
            </span>
          </label>
          <TextField label={t('cves.f.epss')} mono inputMode="decimal" placeholder="10" value={epss} onChange={(e) => setEpss(e.target.value)} />
          <div className="cti-field">
            <label className="cti-field__label" htmlFor="pub">
              {t('cves.f.published')}
            </label>
            <select id="pub" className="cti-select" style={{ height: 32 }} value={published} onChange={(e) => setPublished(e.target.value as Published)}>
              {(['any', '7d', '30d', '12m'] as Published[]).map((p) => (
                <option key={p} value={p}>
                  {t(`cves.f.pub.${p}` as MessageKey)}
                </option>
              ))}
            </select>
          </div>
          <TextField
            label={t('cves.f.vendor')}
            mono
            placeholder={t('cves.f.vendorPlaceholder')}
            value={vendorProduct}
            onChange={(e) => setVendorProduct(e.target.value)}
            error={needsVendor ? t('cves.f.productNeedsVendor') : undefined}
          />
          <div className="grow" />
          <Button variant="ghost" size="sm" onClick={clearFilters} disabled={!filtersActive}>
            {t('common.clearFilters')}
          </Button>
        </aside>

        <section className="card card--clip main col">
          <div className="card-toolbar">
            {severities.length > 0 ? (
              <Tag tone="accent" onRemove={() => setSeverities([])}>
                {t('cves.tag.severity', { list: SEVERITIES.filter((s) => severities.includes(s)).map((s) => t(`sev.${s}` as MessageKey)).join(', ') })}
              </Tag>
            ) : null}
            {cvss[0] > 0 || cvss[1] < 10 ? (
              <Tag tone="accent" onRemove={() => setCvss([0, 10])}>
                {t('cves.tag.cvss', { min: cvss[0].toFixed(1), max: cvss[1].toFixed(1) })}
              </Tag>
            ) : null}
            {kev ? (
              <Tag tone="accent" onRemove={() => setKev(false)}>
                {t('cves.tag.kev')}
              </Tag>
            ) : null}
            {(epssMin ?? 0) > 0 ? (
              <Tag tone="accent" onRemove={() => setEpss('')}>
                {t('cves.tag.epss', { v: epss })}
              </Tag>
            ) : null}
            {published !== 'any' ? (
              <Tag tone="accent" onRemove={() => setPublished('any')}>
                {t('cves.tag.published', { v: t(`cves.f.pub.${published}` as MessageKey) })}
              </Tag>
            ) : null}
            {dvp ? (
              <Tag tone="accent" onRemove={() => setVendorProduct('')}>
                {t('cves.tag.vendor', { v: dvp })}
              </Tag>
            ) : null}
            <span className="grow" />
            <span className="sub">{t('cves.sort')}</span>
            <select className="cti-select" aria-label={t('cves.sort')} value={sort} onChange={(e) => setSort(e.target.value as CveQueryParams['sort'])}>
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(`cves.sort.${s}` as MessageKey)}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
              aria-label={t(order === 'desc' ? 'cves.sort.desc' : 'cves.sort.asc')}
              icon={order === 'desc' ? 'down' : 'up'}
            />
          </div>

          <div className="scroll-x">
            <div className="trow trow--head" style={cols()}>
              <span>{t('cves.col.cve')}</span>
              <span>{t('cves.col.severity')}</span>
              <span>{t('cves.col.epss')}</span>
              <span>{t('cves.col.kev')}</span>
              <span>{t('cves.col.desc')}</span>
              <span className="right">{t('cves.col.published')}</span>
            </div>

            {query.isPending ? (
              Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="trow" style={cols({ height: 52 })}>
                  <Skeleton height={10} width={110} />
                  <Skeleton height={10} width={90} />
                  <Skeleton height={10} width={70} />
                  <span />
                  <Skeleton height={10} width="80%" />
                  <Skeleton height={10} width={70} />
                </div>
              ))
            ) : query.isError ? (
              <StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={() => void query.refetch()}>{t('common.retry')}</Button>} />
            ) : items.length === 0 ? (
              filtersActive || dq ? (
                <StateBlock
                  kind="no-results"
                  title={t('cves.empty.title')}
                  description={t('cves.empty.desc')}
                  action={filtersActive ? <Button onClick={clearFilters}>{t('common.clearFilters')}</Button> : undefined}
                />
              ) : (
                <StateBlock kind="empty" title={t('cves.noDb.title')} description={t('cves.noDb.desc')} />
              )
            ) : (
              items.map((r) => (
                <div key={r.id} className="trow" style={cols({ padding: '10px 16px' })}>
                  <Link href={`/cves/${r.id}`} className="mono-12" style={{ fontWeight: 500 }}>
                    {r.id}
                  </Link>
                  <span>
                    <SeverityBadge score={r.cvssScore} severity={SEVERITY_BY_LEVEL[r.cvssSeverity]} />
                  </span>
                  <EpssMeter value={r.epss} />
                  <span>{r.isKev ? <KevFlag iconOnly /> : null}</span>
                  <div className="col min0" style={{ gap: 4 }}>
                    <span className="ellipsis ink" title={r.description}>
                      {highlightParts(r.description, dq).map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>))}
                    </span>
                    <span className="row gap-4 wrap">
                      {r.affected.slice(0, 3).map((a) => (
                        <Tag key={a}>{a}</Tag>
                      ))}
                    </span>
                  </div>
                  <span className="right mono-12 muted">{formatDate(r.published)}</span>
                </div>
              ))
            )}
          </div>

          {items.length > 0 ? (
            <div className="row gap-12 subtle" style={{ padding: '14px 16px', fontSize: 12 }}>
              {isFetchingNextPage ? (
                <>
                  <Skeleton width={150} height={10} />
                  <Skeleton width={90} height={10} />
                  <Skeleton width={320} height={10} />
                </>
              ) : null}
              <span className="grow" />
              <span>
                {hasNextPage
                  ? t('cves.loadMore', { n: formatNumber(items.length, locale), total: total !== undefined ? ` / ${formatNumber(total, locale)}` : '' })
                  : t('cves.allLoaded', { n: formatNumber(items.length, locale) })}
              </span>
            </div>
          ) : null}
          <div ref={sentinel} style={{ height: 1 }} />
        </section>
      </div>
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
