'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth-provider';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { Button, Icon, KevFlag, RiskRing, Skeleton, SlaChip, StateBlock, StatusPill, buttonClass, cx, type IconName } from '@/components/ui';
import { RankedBars, SeverityDonut } from '@/components/dashboard/charts';
import { useAssets } from '@/features/assets/hooks';
import { useCveStats } from '@/features/cves/hooks';
import { useVulns } from '@/features/vulns/hooks';
import { useI18n, type MessageKey } from '@/i18n';
import { api } from '@/lib/api';
import { summarizeExposure } from '@/lib/company';
import { greetingName } from '@/lib/dashboard';
import { formatNumber } from '@/lib/format';
import { PERMISSIONS as P } from '@/lib/permissions';
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

function EmptyInventory() {
  const { t } = useI18n();
  const { can } = useAuth();
  return (
    <div className="rounded-xl border border-line bg-surface shadow-card">
      <StateBlock
        kind="empty"
        title={t('dash.co.empty.title')}
        description={t('dash.co.empty.desc')}
        action={can(P.ASSET_WRITE) ? (
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/assets/new" className={buttonClass('primary')}>{t('dash.co.empty.add')}</Link>
            <Link href="/assets/import" className={buttonClass()}>{t('dash.co.empty.import')}</Link>
          </div>
        ) : undefined}
      />
    </div>
  );
}

/** What the company itself is exposed to: its assets, the vulnerabilities matched on them and the fix deadlines. */
function CompanySection() {
  const { t, locale } = useI18n();
  const nf = (n: number) => formatNumber(n, locale);
  const assets = useAssets({ q: '', tab: 'all', exposed: false, criticalVulns: false, stale: false, env: '', criticality: '', sort: 'risk' });
  const vulns = useVulns();

  if (assets.isError || vulns.isError) {
    return (
      <div className="rounded-xl border border-line bg-surface shadow-card">
        <StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={() => { void assets.refetch(); void vulns.refetch(); }}>{t('common.retry')}</Button>} />
      </div>
    );
  }

  const stats = assets.data?.pages[0]?.stats;
  const topAssets = (assets.data?.pages[0]?.items ?? []).slice(0, 5);
  const items = vulns.data?.items;
  const x = items ? summarizeExposure(items) : null;
  const loading = !stats || !x;
  const heroDetail = x
    ? [x.kevExposed > 0 ? t('dash.co.hero.exposed', { n: nf(x.kevExposed) }) : null, x.overdue > 0 ? t('dash.co.hero.overdue', { n: nf(x.overdue) }) : null]
      .filter(Boolean)
      .join(' ')
    : '';

  if (stats && stats.total === 0) return <EmptyInventory />;

  return (
    <>
      <section className="flex flex-col gap-4 rounded-xl bg-accent-soft p-6 md:flex-row md:items-center">
        <div className="flex min-w-0 grow flex-col gap-1">
          {x ? (
            x.active === 0 ? (
              <p className="m-0 text-xl leading-7 font-semibold tracking-tight text-ink">{t('dash.co.hero.clean')}</p>
            ) : (
              <>
                <p className="m-0 text-xl leading-7 font-semibold tracking-tight text-ink">{t('dash.co.hero.some', { n: nf(x.active), k: nf(x.kev) })}</p>
                {heroDetail ? <p className="m-0 text-[15px] text-ink-muted">{heroDetail}</p> : null}
              </>
            )
          ) : (
            <Skeleton lines={2} height={16} />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/vulns" className={buttonClass('primary')}>{t('dash.co.hero.cta.vulns')}</Link>
          <Link href="/assets" className={buttonClass()}>{t('dash.co.hero.cta.assets')}</Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={t('dash.co.k.assets')} hint={t('dash.co.k.assets.hint', { n: nf(stats?.active ?? 0) })} icon="search" value={stats ? nf(stats.total) : ''} href="/assets" loading={loading} />
        <Kpi label={t('dash.co.k.exposed')} hint={t('dash.co.k.exposed.hint')} icon="alert" tone="text-high-ink" value={stats ? nf(stats.exposed) : ''} href="/assets" loading={loading} />
        <Kpi label={t('dash.co.k.critical')} hint={t('dash.co.k.critical.hint')} icon="flame" tone="text-critical-ink" value={stats ? nf(stats.withCritical) : ''} href="/assets" loading={loading} />
        <Kpi label={t('dash.co.k.overdue')} hint={t('dash.co.k.overdue.hint')} icon="clock" tone="text-critical-ink" value={x ? nf(x.overdue) : ''} href="/vulns" loading={loading} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title={t('dash.co.fix.title')} sub={t('dash.co.fix.sub')} action={<Link href="/vulns" className="text-sm font-medium">{t('dash.co.fix.all')}</Link>}>
            {!x ? <Skeleton lines={4} height={14} /> : null}
            {x && x.top.length === 0 ? <StateBlock kind="empty" compact title={t('dash.co.fix.empty')} /> : null}
            <ul className="m-0 -mx-2 flex list-none flex-col p-0">
              {(x?.top ?? []).map((v) => (
                <li key={v.id}>
                  <Link href={`/cves/${v.cve}`} className="flex items-center gap-4 rounded-lg px-2 py-3 text-ink no-underline hover:bg-surface-2 hover:text-ink">
                    <RiskRing score={v.risk} size={40} />
                    <span className="flex min-w-0 grow flex-col">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[15px] font-semibold">{v.cve}</span>
                        {v.kev ? <KevFlag /> : null}
                      </span>
                      <span className="truncate text-[15px] text-ink-muted">{v.host}{v.exposed ? ` · ${t('dash.co.assets.exposed')}` : ''}</span>
                    </span>
                    {v.slaHours != null ? <SlaChip hoursLeft={v.slaHours} /> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title={t('dash.co.assets.title')} sub={t('dash.co.assets.sub')} action={<Link href="/assets" className="text-sm font-medium">{t('dash.co.fix.all')}</Link>}>
            {!stats ? <Skeleton lines={4} height={14} /> : null}
            <ul className="m-0 -mx-2 flex list-none flex-col p-0">
              {topAssets.map((a) => {
                const open = a.counts.reduce((n, c) => n + c, 0);
                return (
                  <li key={a.id}>
                    <Link href={`/assets/${a.id}`} className="flex items-center gap-4 rounded-lg px-2 py-3 text-ink no-underline hover:bg-surface-2 hover:text-ink">
                      <RiskRing score={a.risk} size={40} />
                      <span className="flex min-w-0 grow flex-col">
                        <span className="truncate font-medium">{a.name}</span>
                        <span className="truncate text-sm text-ink-muted">{[a.env, a.exposed ? t('dash.co.assets.exposed') : null].filter(Boolean).join(' · ')}</span>
                      </span>
                      <span className="text-sm text-ink-muted tabular-nums">{t('dash.co.assets.open', { n: nf(open) })}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel title={t('dash.co.sev.title')}>
            {x ? <SeverityDonut data={x.severity} href={() => '/vulns'} totalLabel={t('dash.co.sev.total')} /> : <Skeleton height={260} />}
          </Panel>
          <Panel title={t('dash.co.status.title')} sub={t('dash.co.status.sub')}>
            {!x ? <Skeleton lines={4} height={12} /> : null}
            {x ? (
              <>
                <RankedBars
                  color="var(--chart-1)"
                  rows={(['open', 'in_progress', 'accepted', 'mitigated'] as const).map((k) => ({ key: k, label: t(`status.${k}` as MessageKey), count: x.status[k], href: '/vulns' }))}
                />
                <div className="border-t border-line pt-4">
                  <h3 className="mb-3 text-balance text-sm font-semibold text-ink">{t('dash.co.ops.title')}</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'kev', label: t('dash.co.ops.kev'), value: x.kev, tone: 'text-critical-ink' },
                      { key: 'exposed', label: t('dash.co.ops.exposed'), value: x.kevExposed, tone: 'text-high-ink' },
                      { key: 'overdue', label: t('dash.co.ops.overdue'), value: x.overdue, tone: 'text-critical-ink' },
                    ].map((item) => (
                      <Link key={item.key} href="/vulns" className="flex min-w-0 flex-col gap-0.5 rounded-lg bg-surface-2 p-3 text-ink no-underline hover:bg-surface-3 hover:text-ink">
                        <span className={cx('text-xl font-semibold tabular-nums', item.tone)}>{nf(item.value)}</span>
                        <span className="text-pretty text-xs leading-4 text-ink-muted">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </Panel>
        </div>
      </div>
    </>
  );
}

/** Worldwide picture, kept small: it is context for the company view above, not the main story. */
function WorldSection() {
  const { t, locale } = useI18n();
  const { data, isPending } = useCveStats();
  const nf = (n: number) => formatNumber(n, locale);
  return (
    <Panel title={t('dash.world.title')} sub={t('dash.world.sub')} action={<Link href="/cves" className="text-sm font-medium">{t('dash.world.all')}</Link>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label={t('dash.k.new')} hint={t('dash.k.new.hint')} icon="clock" value={data ? nf(data.addedLast24h) : ''} loading={isPending} />
        <Kpi label={t('dash.k.kev')} hint={t('dash.k.kev.hint')} icon="flame" tone="text-critical-ink" value={data ? nf(data.kevCount) : ''} href="/cves?kev=1" loading={isPending} />
        <Kpi label={t('dash.k.critical')} hint={t('dash.k.critical.hint')} icon="alert" tone="text-critical-ink" value={data ? nf(data.criticalCount) : ''} href="/cves?severity=critical" loading={isPending} />
      </div>
    </Panel>
  );
}

function Dashboard() {
  const { t, locale } = useI18n();
  const { can, user } = useAuth();
  const age = useAge();
  const sync = useQuery({ queryKey: ['sync'], queryFn: () => api<SyncState[]>('/sync'), enabled: can(P.SYNC_VIEW) });
  const name = greetingName(user?.name);
  const health = sync.data ? overallHealth(sync.data) : null;
  const nvd = sync.data?.find((s) => s.source === 'nvd')?.lastSuccessAt;
  const today = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const company = can(P.ASSET_READ) && can(P.VULN_READ);

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
      {company ? <CompanySection /> : null}
      {can(P.CVE_READ) ? <WorldSection /> : null}
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
