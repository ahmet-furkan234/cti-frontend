'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { RequirePermission } from '@/components/shell/page-guard';
import { AssetsTab, ReferencesTab, TimelineTab } from '@/components/cves/detail-tabs';
import {
  buildTimeline, CvssBreakdown, CweCard, EpssCard, ProductsTable, ReferencesSummary, Section, TimelineList,
} from '@/components/cves/detail-parts';
import { Banner, Button, KevFlag, SeverityBadge, Skeleton, StateBlock, Tabs, buttonClass } from '@/components/ui';
import { useCve } from '@/features/cves/hooks';
import { useI18n } from '@/i18n';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { PERMISSIONS as P } from '@/lib/permissions';
import { SEVERITY_BY_LEVEL } from '@/lib/severity';

type TabId = 'overview' | 'assets' | 'refs' | 'timeline';
const TAB_IDS: TabId[] = ['overview', 'assets', 'refs', 'timeline'];

function firstSentence(text: string, max = 110): string {
  const s = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
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
      <div className="page">
        <div className="card">
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
      <div className="page">
        <div className="card">
          <StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={() => void refetch()}>{t('common.retry')}</Button>} />
        </div>
      </div>
    );
  }
  if (isPending || !cve) {
    return (
      <div className="page page--tight">
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
    { id: 'timeline', label: t('cve.tab.timeline') },
  ];

  return (
    <div className="page page--tight">
      <nav aria-label={t('cve.breadcrumb')} className="breadcrumb">
        <Link href="/cves">{t('cves.title')}</Link> / <span className="mono">{cve.id}</span>
      </nav>

      <div className="page-head">
        <h1 className="h1 h1--mono">{cve.id}</h1>
        <SeverityBadge score={cve.cvssScore > 0 ? cve.cvssScore : null} severity={SEVERITY_BY_LEVEL[cve.cvssSeverity]} />
        {cve.isKev ? <KevFlag ransomware={cve.kevRansomware} /> : null}
        <span className="sub ellipsis" style={{ flex: '1 1 0', minWidth: 120 }} title={cve.description}>{firstSentence(cve.description)}</span>
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
        <div className="grid grid-3" style={{ alignItems: 'start' }}>
          <div className="col gap-16 span-2 min0">
            <Section title={t('cve.description')}>
              <p className="muted" style={{ maxWidth: 760 }}>{cve.description || '—'}</p>
              <CvssBreakdown cve={cve} />
            </Section>
            <ProductsTable cve={cve} />
            <ReferencesSummary refs={cve.references} />
          </div>
          <div className="col gap-16">
            <EpssCard cve={cve} />
            <CweCard cwe={cve.cwe} />
            <section className="card card--pad col" style={{ gap: 10 }}>
              <h2 className="h3">{t('cve.timeline')}</h2>
              <TimelineList events={events} compact />
            </section>
          </div>
        </div>
      ) : null}
      {tab === 'assets' ? <AssetsTab /> : null}
      {tab === 'refs' ? <ReferencesTab cve={cve} /> : null}
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
