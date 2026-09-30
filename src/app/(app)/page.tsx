'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth-provider';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { Button, KevFlag, Skeleton, StatTile, StateBlock } from '@/components/ui';
import { DailyChart, SeverityDonut } from '@/components/dashboard/charts';
import { useCveStats } from '@/features/cves/hooks';
import { useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { formatDateTime, formatNumber } from '@/lib/format';
import { PERMISSIONS as P } from '@/lib/permissions';
import type { SyncState } from '@/lib/types';

function Dashboard() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const { data, isPending, isError, refetch } = useCveStats();
  const sync = useQuery({ queryKey: ['sync'], queryFn: () => api<SyncState[]>('/sync'), enabled: can(P.SYNC_VIEW) });
  const nvd = sync.data?.find((s) => s.source === 'nvd')?.lastSuccessAt;
  const nf = (n: number) => formatNumber(n, locale);

  if (isError) {
    return (
      <div className="page">
        <div className="card">
          <StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={() => void refetch()}>{t('common.retry')}</Button>} />
        </div>
      </div>
    );
  }

  const maxVendor = Math.max(1, ...(data?.topVendors.map((v) => v.count) ?? [1]));
  const maxCwe = Math.max(1, ...(data?.topCwe.map((v) => v.count) ?? [1]));

  return (
    <div className="page">
      <PageHeader
        title={t('dash.title')}
        subtitle={
          data
            ? nvd
              ? t('dash.subtitle', { n: nf(data.total), time: formatDateTime(nvd) })
              : t('dash.subtitleNoSync', { n: nf(data.total) })
            : undefined
        }
      />

      <div className="grid grid-4">
        <StatTile label={t('dash.k.total')} value={data ? nf(data.total) : ''} hint={t('dash.k.total.hint')} loading={isPending} />
        <StatTile label={t('dash.k.kev')} icon="flame" tone="kev" value={data ? nf(data.kevCount) : ''} hint={t('dash.k.kev.hint')} loading={isPending} />
        <StatTile label={t('dash.k.critical')} icon="alert" tone="critical" value={data ? nf(data.criticalCount) : ''} hint={t('dash.k.critical.hint')} loading={isPending} />
        <StatTile label={t('dash.k.new')} icon="clock" value={data ? nf(data.addedLast24h) : ''} hint={t('dash.k.new.hint')} loading={isPending} />
      </div>

      {data && data.total === 0 ? (
        <div className="card">
          <StateBlock kind="empty" title={t('dash.empty.title')} description={t('dash.empty.desc')} />
        </div>
      ) : (
        <>
          <div className="grid grid-3">
            <section className="card card--pad col span-2" style={{ gap: 8 }}>
              <div className="row gap-16">
                <h2 className="h2 grow">{t('dash.trend.title')}</h2>
                <span className="row gap-6 muted" style={{ fontSize: 12 }}>
                  <span style={{ width: 12, height: 2, background: 'var(--chart-1)' }} />
                  {t('dash.trend.series')}
                </span>
              </div>
              {data ? <DailyChart points={data.perDay} /> : <Skeleton height={208} />}
            </section>
            <section className="card card--pad col" style={{ gap: 8 }}>
              <h2 className="h2">{t('dash.sev.title')}</h2>
              {data ? <SeverityDonut data={data.severityDistribution} /> : <Skeleton height={160} />}
            </section>
          </div>

          <div className="grid grid-3">
            <section className="card card--clip col">
              <div className="card-head">
                <h2 className="h2 grow">{t('dash.kev.title')}</h2>
                <span className="sub">{t('dash.kev.sub')}</span>
              </div>
              {(data?.newestKev ?? []).map((k) => (
                <div key={k.id} className="row" style={{ gap: 10, minHeight: 44, padding: '0 16px', borderTop: '1px solid var(--border)' }}>
                  <KevFlag iconOnly />
                  <div className="col min0 grow">
                    <Link href={`/cves/${k.id}`} className="mono-12" style={{ lineHeight: '16px', fontWeight: 500 }}>{k.id}</Link>
                    <span className="ellipsis muted" style={{ fontSize: 11, lineHeight: '16px' }}>{k.description}</span>
                  </div>
                  <span className="mono-12 muted">{k.cvssScore > 0 ? k.cvssScore.toFixed(1) : ''}</span>
                </div>
              ))}
              {isPending ? <div style={{ padding: 16 }}><Skeleton lines={4} height={10} /></div> : null}
              {data && data.newestKev.length === 0 ? <StateBlock kind="empty" compact title={t('dash.noRows')} /> : null}
            </section>

            <section className="card card--clip col">
              <div className="card-head">
                <h2 className="h2 grow">{t('dash.vendors.title')}</h2>
                <span className="sub">{t('dash.vendors.sub')}</span>
              </div>
              {(data?.topVendors ?? []).map((v) => (
                <div key={v.vendor} className="row" style={{ gap: 10, minHeight: 36, padding: '0 16px', borderTop: '1px solid var(--border)' }}>
                  <span className="mono-12 grow ellipsis">{v.vendor}</span>
                  <span className="bar-track" style={{ width: 80 }}><span className="bar-fill" style={{ width: `${(v.count / maxVendor) * 100}%`, background: 'var(--chart-1)' }} /></span>
                  <span className="mono-12 right" style={{ width: 44 }}>{nf(v.count)}</span>
                </div>
              ))}
              {isPending ? <div style={{ padding: 16 }}><Skeleton lines={4} height={10} /></div> : null}
              {data && data.topVendors.length === 0 ? <StateBlock kind="empty" compact title={t('dash.noRows')} /> : null}
            </section>

            <section className="card card--clip col">
              <div className="card-head">
                <h2 className="h2 grow">{t('dash.cwe.title')}</h2>
                <span className="sub">{t('dash.cwe.sub')}</span>
              </div>
              {(data?.topCwe ?? []).map((c) => (
                <div key={c.cwe} className="row" style={{ gap: 10, minHeight: 36, padding: '0 16px', borderTop: '1px solid var(--border)' }}>
                  <span className="mono-12 grow">{c.cwe}</span>
                  <span className="bar-track" style={{ width: 80 }}><span className="bar-fill" style={{ width: `${(c.count / maxCwe) * 100}%`, background: 'var(--chart-3)' }} /></span>
                  <span className="mono-12 right" style={{ width: 44 }}>{nf(c.count)}</span>
                </div>
              ))}
              {isPending ? <div style={{ padding: 16 }}><Skeleton lines={4} height={10} /></div> : null}
              {data && data.topCwe.length === 0 ? <StateBlock kind="empty" compact title={t('dash.noRows')} /> : null}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequirePermission any={[P.DASHBOARD_VIEW]}>
      <Dashboard />
    </RequirePermission>
  );
}
