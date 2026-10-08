'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { RequirePermission } from '@/components/shell/page-guard';
import { AssetsTab, ReferencesTab, TimelineTab } from '@/components/cves/detail-tabs';
import { VectorTab } from '@/components/cves/vector-tab';
import {
  buildTimeline, CweCard, EpssCard, ProductsTable, ReferencesSummary, Section, TimelineList,
} from '@/components/cves/detail-parts';
import { Banner, Button, KevFlag, SeverityBadge, Skeleton, StateBlock, Tabs, buttonClass } from '@/components/ui';
import { useCve } from '@/features/cves/hooks';
import { useI18n } from '@/i18n';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { PERMISSIONS as P } from '@/lib/permissions';
import { SEVERITY_BY_LEVEL } from '@/lib/severity';

type TabId = 'overview' | 'assets' | 'refs' | 'vector' | 'timeline';
const TAB_IDS: TabId[] = ['overview', 'assets', 'refs', 'vector', 'timeline'];

function firstSentence(text: string, max = 110): string {
  const s = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function OverviewMetric({ label, value, detail, tone = 'default' }: { label: string; value: ReactNode; detail: string; tone?: 'default' | 'critical' | 'accent' }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-surface px-5 py-4 shadow-card">
      <span className="text-sm font-medium text-ink-muted">{label}</span>
      <span className={tone === 'critical' ? 'text-2xl font-semibold tabular-nums text-critical-ink' : tone === 'accent' ? 'text-2xl font-semibold tabular-nums text-accent' : 'text-2xl font-semibold tabular-nums text-ink'}>{value}</span>
      <span className="break-words text-xs leading-5 text-ink-subtle">{detail}</span>
    </div>
  );
}

function CveDetailView() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const { id: rawId } = useParams<{ id: string }>();
  const id = decodeURIComponent(rawId).toUpperCase();
  const { data: cve, isPending, error, refetch } = useCve(id);
  const tab: TabId = TAB_IDS.includes(params.get('tab') as TabId) ? (params.get('tab') as TabId) : 'overview';

  const setTab = (next: string) => {
    const sp = new URLSearchParams(params.toString());
    if (next === 'overview') sp.delete('tab');
    else sp.set('tab', next);
    const qs = sp.toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  };

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="mx-auto flex w-full max-w-[1440px] min-w-0 grow flex-col gap-5 p-4 md:p-8">
        <div className="min-w-0 rounded-xl border border-line bg-surface shadow-card">
          <StateBlock
            kind="no-results"
            code="404"
            title={t('cve.notFound.title')}
            description={t('cve.notFound.desc', { id })}
            action={<Link href="/cves" className={buttonClass()}>{t('cve.backToList')}</Link>}
          />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-[1440px] min-w-0 grow flex-col gap-5 p-4 md:p-8">
        <div className="min-w-0 rounded-xl border border-line bg-surface shadow-card">
          <StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={() => void refetch()}>{t('common.retry')}</Button>} />
        </div>
      </div>
    );
  }
  if (isPending || !cve) {
    return (
      <div className="mx-auto flex w-full max-w-[1440px] min-w-0 grow flex-col p-4 md:p-8 gap-4! md:px-8! md:py-6!">
        <Skeleton width={260} height={28} />
        <Skeleton lines={4} height={12} />
      </div>
    );
  }

  const events = buildTimeline(cve, t);
  const tabs = [
    { id: 'overview', label: t('cve.tab.overview') },
    { id: 'assets', label: t('cve.tab.assets') },
    { id: 'refs', label: t('cve.tab.refs'), count: cve.references.length },
    { id: 'vector', label: t('cve.tab.vector') },
    { id: 'timeline', label: t('cve.tab.timeline') },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1440px] min-w-0 grow flex-col p-4 md:p-8 gap-4! md:px-8! md:py-6!">
      <nav aria-label={t('cve.breadcrumb')} className="text-sm text-ink-muted [&_a]:text-ink-muted [&_a:hover]:text-ink">
        <Link href="/cves">{t('cves.title')}</Link> / <span className="font-mono">{cve.id}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl leading-8 font-semibold tracking-tight font-mono">{cve.id}</h1>
        <SeverityBadge score={cve.cvssScore > 0 ? cve.cvssScore : null} severity={SEVERITY_BY_LEVEL[cve.cvssSeverity]} />
        {cve.isKev ? <KevFlag ransomware={cve.kevRansomware} /> : null}
        <span className="text-sm text-ink-muted truncate min-w-[120px]" style={{ flex: '1 1 0' }} title={cve.description}>{firstSentence(cve.description)}</span>
        <Button icon="copy" onClick={() => void navigator.clipboard?.writeText(window.location.href)}>{t('cve.copyLink')}</Button>
        <Button variant="primary" icon="alert" disabled title={t('cve.watch.soon')}>{t('cve.watch')}</Button>
      </div>

      {cve.isKev && cve.kevAdded ? (
        <Banner tone="kev" title={t('cve.kev.title')}>
          <span>
            {cve.kevDueDate
              ? t('cve.kev.text', { added: formatDate(cve.kevAdded), due: formatDate(cve.kevDueDate) })
              : t('cve.kev.textNoDue', { added: formatDate(cve.kevAdded) })}
            {cve.kevRansomware ? t('cve.kev.ransomware') : ''}
          </span>
        </Banner>
      ) : null}

      <Tabs label="CVE" items={tabs} value={tab} onChange={setTab} />

      {tab === 'overview' ? (
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <OverviewMetric
              label={t('cve.overview.cvss')}
              value={cve.cvssScore > 0 ? cve.cvssScore.toFixed(1) : '—'}
              detail={cve.cvssVersion ? `CVSS ${cve.cvssVersion}` : t('cve.notScored.short')}
              tone={cve.cvssSeverity >= 4 ? 'critical' : 'default'}
            />
            <OverviewMetric
              label={t('cve.overview.epss')}
              value={cve.epss > 0 ? `%${(cve.epss * 100).toFixed(1)}` : '—'}
              detail={cve.epssPercentile > 0 ? t('cve.overview.percentile', { n: Math.round(cve.epssPercentile * 100) }) : t('epss.pending.desc')}
              tone="accent"
            />
            <OverviewMetric
              label={t('cve.overview.configs')}
              value={cve.cpeMatches.length}
              detail={t('cve.overview.vendors', { n: cve.vendors.length })}
            />
            <OverviewMetric
              label={t('cve.overview.refs')}
              value={cve.references.length}
              detail={cve.cwe.length ? cve.cwe.join(' · ') : t('cve.cwe.none')}
            />
          </div>

          <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-4">
              <Section title={t('cve.description')}>
                <p className="text-pretty leading-7 text-ink-muted">{cve.description || '—'}</p>
                <dl className="mt-2 grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-3">
                  <div className="min-w-0"><dt className="text-xs font-medium text-ink-subtle">{t('cve.overview.published')}</dt><dd className="mt-1 text-sm tabular-nums text-ink">{formatDate(cve.published)}</dd></div>
                  <div className="min-w-0"><dt className="text-xs font-medium text-ink-subtle">{t('cve.overview.modified')}</dt><dd className="mt-1 text-sm tabular-nums text-ink">{formatDate(cve.lastModified)}</dd></div>
                  <div className="min-w-0"><dt className="text-xs font-medium text-ink-subtle">{t('cve.overview.status')}</dt><dd className="mt-1 truncate text-sm text-ink">{cve.vulnStatus || '—'}</dd></div>
                </dl>
              </Section>
              <ProductsTable cve={cve} />
              <ReferencesSummary refs={cve.references} />
            </div>
            <aside className="flex min-w-0 flex-col gap-4">
              <EpssCard cve={cve} />
              <CweCard cwe={cve.cwe} />
              <section className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-line bg-surface p-5 shadow-card">
                <h2 className="text-balance text-base font-semibold">{t('cve.timeline')}</h2>
                <TimelineList events={events} compact />
              </section>
            </aside>
          </div>
        </div>
      ) : null}
      {tab === 'assets' ? <AssetsTab cveId={cve.id} /> : null}
      {tab === 'refs' ? <ReferencesTab cve={cve} /> : null}
      {tab === 'vector' ? <VectorTab cve={cve} /> : null}
      {tab === 'timeline' ? <TimelineTab cve={cve} /> : null}
    </div>
  );
}

export default function CveDetailPage() {
  return (
    <RequirePermission any={[P.CVE_READ]}>
      <Suspense>
        <CveDetailView />
      </Suspense>
    </RequirePermission>
  );
}
