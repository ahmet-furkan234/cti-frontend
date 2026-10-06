'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth-provider';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { Button, Icon, SeverityBadge, Skeleton, StateBlock, StatusPill, buttonClass, cx, type IconName } from '@/components/ui';
import { DailyChart, RankedBars, SeverityDonut } from '@/components/dashboard/charts';
import { useCveStats } from '@/features/cves/hooks';
import { useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { cweName, greetingName, weekOverWeek } from '@/lib/dashboard';
import { formatDate, formatNumber } from '@/lib/format';
import { PERMISSIONS as P } from '@/lib/permissions';
import { severityFromScore } from '@/lib/severity';
import { overallHealth } from '@/lib/sync-health';
import { useAge } from '@/lib/use-age';
import type { SyncState } from '@/lib/types';

const PAGE = 'mx-auto flex w-full max-w-[1200px] min-w-0 grow flex-col gap-5 p-4 md:p-8';

function Panel({ title, sub, action, children, className }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx('flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-card', className)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 grow">
          <h2 className="text-lg font-semibold">{title}</h2>
          {sub ? <p className="m-0 text-sm text-ink-muted">{sub}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, hint, value, icon, href, loading, tone }: { label: string; hint: string; value: string; icon: IconName; href?: string; loading: boolean; tone?: string }) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-sm font-medium text-ink-muted">
        <Icon name={icon} size={16} className={tone} />
        {label}
      </span>
      {loading ? <Skeleton width={80} height={32} /> : <span className="text-3xl leading-9 font-semibold tabular-nums text-ink">{value}</span>}
      <span className="text-sm text-ink-subtle">{hint}</span>
    </>
  );
  const cls = 'flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-surface p-5 shadow-card no-underline';
  return href ? <Link href={href} className={cx(cls, 'transition-colors hover:border-line-strong hover:bg-surface-2')}>{body}</Link> : <div className={cls}>{body}</div>;
}

function Dashboard() {
  const { t, locale } = useI18n();
  const { can, user } = useAuth();
  const age = useAge();
  const { data, isPending, isError, refetch } = useCveStats();
  const sync = useQuery({ queryKey: ['sync'], queryFn: () => api<SyncState[]>('/sync'), enabled: can(P.SYNC_VIEW) });
  const nf = (n: number) => formatNumber(n, locale);

  if (isError) {
    return (
      <div className={PAGE}>
        <div className="rounded-xl border border-line bg-surface shadow-card">
          <StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={() => void refetch()}>{t('common.retry')}</Button>} />
        </div>
      </div>
    );
  }

  const name = greetingName(user?.name);
  const health = sync.data ? overallHealth(sync.data) : null;
  const nvd = sync.data?.find((s) => s.source === 'nvd')?.lastSuccessAt;
  const week = data ? weekOverWeek(data.perDay) : null;
  const newest = data?.newestKev[0];
  const today = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className={PAGE}>
      <PageHeader
        title={name ? t('dash.greeting', { name }) : t('dash.greeting.anon')}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="capitalize">{today}</span>
            {health ? (
              <>
                <span aria-hidden="true">·</span>
                <StatusPill status={health} label={t(health === 'healthy' ? 'dash.updated.ok' : health === 'degraded' ? 'dash.updated.late' : 'dash.updated.fail')} />
                {nvd ? <span className="text-ink-subtle">{t('dash.updated.at', { age: age(nvd) })}</span> : null}
              </>
            ) : null}
          </span>
        }
      />

      {data && data.total === 0 ? (
        <div className="rounded-xl border border-line bg-surface shadow-card">
          <StateBlock kind="empty" title={t('dash.empty.title')} description={t('dash.empty.desc')} />
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-xl bg-accent-soft p-6 md:flex-row md:items-center">
            <div className="flex min-w-0 grow flex-col gap-1">
              {data ? (
                <>
                  <p className="m-0 text-xl leading-7 font-semibold tracking-tight text-ink">{data.addedLast24h > 0 ? t('dash.hero.new', { n: nf(data.addedLast24h) }) : t('dash.hero.none')}</p>
                  <p className="m-0 text-[15px] text-ink-muted">{newest ? t('dash.hero.kev', { n: nf(data.kevCount), id: newest.id }) : t('dash.hero.kevNone')}</p>
                </>
              ) : (
                <Skeleton lines={2} height={16} />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/cves?kev=1" className={buttonClass('primary')}>{t('dash.hero.cta.kev')}</Link>
              <Link href="/cves?severity=critical" className={buttonClass()}>{t('dash.hero.cta.critical')}</Link>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label={t('dash.k.kev')} hint={t('dash.k.kev.hint')} icon="flame" tone="text-critical-ink" value={data ? nf(data.kevCount) : ''} href="/cves?kev=1" loading={isPending} />
            <Kpi label={t('dash.k.critical')} hint={t('dash.k.critical.hint')} icon="alert" tone="text-critical-ink" value={data ? nf(data.criticalCount) : ''} href="/cves?severity=critical" loading={isPending} />
            <Kpi label={t('dash.k.new')} hint={t('dash.k.new.hint')} icon="clock" value={data ? nf(data.addedLast24h) : ''} loading={isPending} />
            <Kpi label={t('dash.k.total')} hint={t('dash.k.total.hint')} icon="search" value={data ? nf(data.total) : ''} href="/cves" loading={isPending} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Panel
              title={t('dash.trend.title')}
              sub={t('dash.trend.sub')}
              action={
                week ? (
                  <div className="text-right text-sm">
                    <div className="font-medium">{t('dash.trend.week', { n: nf(week.last) })}</div>
                    <div className={cx(week.pct == null || week.pct === 0 ? 'text-ink-muted' : week.pct > 0 ? 'text-high-ink' : 'text-low-ink')}>
                      {week.pct == null || week.pct === 0 ? t('dash.trend.same') : week.pct > 0 ? t('dash.trend.more', { p: week.pct }) : t('dash.trend.less', { p: Math.abs(week.pct) })}
                    </div>
                  </div>
                ) : undefined
              }
            >
              {data ? <DailyChart points={data.perDay} /> : <Skeleton height={300} />}
            </Panel>
            <Panel title={t('dash.sev.title')}>{data ? <SeverityDonut data={data.severityDistribution} /> : <Skeleton height={260} />}</Panel>
          </div>

          <Panel
            title={t('dash.kev.title')}
            sub={t('dash.kev.sub')}
            action={<Link href="/cves?kev=1" className="text-sm font-medium">{t('dash.kev.all')}</Link>}
          >
            {isPending ? <Skeleton lines={4} height={14} /> : null}
            {data && data.newestKev.length === 0 ? <StateBlock kind="empty" compact title={t('dash.noRows')} /> : null}
            <ul className="m-0 -mx-2 flex list-none flex-col p-0">
              {(data?.newestKev ?? []).map((k) => (
                <li key={k.id}>
                  <Link href={`/cves/${k.id}`} className="flex items-start gap-4 rounded-lg px-2 py-3 text-ink no-underline hover:bg-surface-2 hover:text-ink">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-critical-soft text-critical-ink"><Icon name="flame" size={17} /></span>
                    <span className="flex min-w-0 grow flex-col">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[15px] font-semibold">{k.id}</span>
                        {k.cvssScore > 0 ? <span className="sm:hidden"><SeverityBadge score={k.cvssScore} severity={severityFromScore(k.cvssScore)} /></span> : null}
                      </span>
                      <span className="line-clamp-2 text-[15px] text-ink-muted">{k.description}</span>
                      {k.kevAdded ? <span className="mt-0.5 text-sm text-ink-subtle">{t('dash.kev.added', { date: formatDate(k.kevAdded) })}</span> : null}
                    </span>
                    {k.cvssScore > 0 ? <span className="hidden sm:block"><SeverityBadge score={k.cvssScore} severity={severityFromScore(k.cvssScore)} /></span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Panel title={t('dash.vendors.title')} sub={t('dash.vendors.sub')}>
              {isPending ? <Skeleton lines={4} height={12} /> : null}
              {data && data.topVendors.length === 0 ? <StateBlock kind="empty" compact title={t('dash.noRows')} /> : null}
              {data ? <RankedBars color="var(--chart-1)" rows={data.topVendors.map((v) => ({ key: v.vendor, label: v.vendor, count: v.count, href: `/cves?vendor=${encodeURIComponent(v.vendor)}` }))} /> : null}
            </Panel>
            <Panel title={t('dash.cwe.title')} sub={t('dash.cwe.sub')}>
              {isPending ? <Skeleton lines={4} height={12} /> : null}
              {data && data.topCwe.length === 0 ? <StateBlock kind="empty" compact title={t('dash.noRows')} /> : null}
              {data ? (
                <RankedBars
                  color="var(--chart-3)"
                  rows={data.topCwe.map((c) => {
                    const friendly = cweName(t, c.cwe);
                    return { key: c.cwe, label: friendly ?? c.cwe, sub: friendly ? c.cwe : undefined, count: c.count };
                  })}
                />
              ) : null}
            </Panel>
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
