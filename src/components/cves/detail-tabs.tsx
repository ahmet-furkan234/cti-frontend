'use client';

import { useMemo, useState } from 'react';
import { Button, MonoText, RiskRing, SearchInput, SlaChip, StatusPill, Tag, Icon } from '@/components/ui';
import { LoadError, LoadingRows } from '@/components/shell/query-state';
import { StateBlock } from '@/components/ui';
import { useCveAssets } from '@/features/vulns/hooks';
import { toCveAssetRow } from '@/features/vulns/map';
import { useAuth } from '@/components/auth-provider';
import { PERMISSIONS as P } from '@/lib/permissions';
import { useI18n, type MessageKey } from '@/i18n';
import { formatDate } from '@/lib/format';
import { useAgeMinutes } from '@/lib/use-age';
import type { CveDetail } from '@/lib/types';
import { buildTimeline, displayUrl, groupOfRef, TimelineList, type RefGroup } from './detail-parts';

/* ---------- References ---------- */
const GROUP_COLOR: Record<RefGroup, string> = { patch: 'var(--low)', advisory: 'var(--accent)', exploit: 'var(--critical)' };

export function ReferencesTab({ cve }: { cve: CveDetail }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<'all' | RefGroup>('all');
  const groups: RefGroup[] = ['patch', 'advisory', 'exploit'];
  const byGroup = useMemo(() => Object.fromEntries(groups.map((g) => [g, cve.references.filter((r) => groupOfRef(r) === g)])) as Record<RefGroup, CveDetail['references']>, [cve.references]);
  const hasPoc = byGroup.exploit.length > 0;
  const cols = { '--cols': 'minmax(0, 1fr) 190px 28px' } as React.CSSProperties;

  const maturity: { key: MessageKey; value: MessageKey; tone: 'critical' | 'muted' }[] = [
    { key: 'cve.mat.poc', value: hasPoc ? 'cve.mat.yes' : 'cve.mat.no', tone: hasPoc ? 'critical' : 'muted' },
    { key: 'cve.mat.kev', value: cve.isKev ? 'cve.mat.confirmed' : 'cve.mat.no', tone: cve.isKev ? 'critical' : 'muted' },
    { key: 'cve.mat.ransomware', value: cve.kevRansomware ? 'cve.mat.yes' : 'cve.mat.unknown', tone: cve.kevRansomware ? 'critical' : 'muted' },
  ];

  return (
    <div className="flex flex-col items-stretch gap-4 xl:flex-row xl:items-start">
      <section className="flex w-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
          {(['all', ...groups] as const).map((g) => (
            <button key={g} type="button" className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 text-sm font-medium text-ink-muted hover:text-ink${filter === g ? ' is-on' : ''}`} onClick={() => setFilter(g)}>
              {t(g === 'all' ? 'cve.refs.all' : (`cve.refs.${g}` as MessageKey))}
              <span className="tabular-nums text-xs opacity-80">{g === 'all' ? cve.references.length : byGroup[g].length}</span>
            </button>
          ))}
          <span className="grow" />
          <Button size="sm" variant="ghost" onClick={() => void navigator.clipboard?.writeText(cve.references.map((r) => r.url).join('\n'))}>
            {t('cve.refs.copyAll')}
          </Button>
        </div>
        {cve.references.length === 0 ? <div className="text-ink-muted p-4">{t('cve.refs.empty')}</div> : null}
        {groups
          .filter((g) => (filter === 'all' || filter === g) && byGroup[g].length > 0)
          .map((g) => (
            <div key={g}>
              <div className="flex h-9 items-center gap-2 border-b border-line bg-canvas px-5 text-sm font-semibold text-ink-muted">
                <span className="w-2 h-2 rounded-xs" style={{ background: GROUP_COLOR[g] }} />
                {t(`cve.refs.${g}` as MessageKey)}
                <span className="text-ink-subtle font-normal">{byGroup[g].length}</span>
              </div>
              {byGroup[g].map((r) => (
                <div key={r.url} className="grid min-h-12 items-center gap-3 border-b border-line last:border-b-0 [grid-template-columns:var(--cols)] min-h-[52px] py-1.5 px-4" style={{ ...cols }}>
                  <span className="flex flex-col min-w-0">
                    <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-sm font-medium">
                      {displayUrl(r.url)}
                    </a>
                    {r.source ? <span className="tabular-nums text-xs text-ink-muted truncate">{r.source}</span> : null}
                  </span>
                  <span className="flex items-center gap-1 flex-wrap">{(r.tags ?? []).map((tag) => <Tag key={tag}>{tag}</Tag>)}</span>
                  <button type="button" className="inline-flex size-9 items-center justify-center rounded-lg text-ink-subtle hover:bg-surface-2 hover:text-ink" aria-label={t('common.copy')} onClick={() => void navigator.clipboard?.writeText(r.url)}>
                    <Icon name="copy" size={13} />
                  </button>
                </div>
              ))}
            </div>
          ))}
      </section>
      <div className="flex flex-col gap-4 w-full xl:w-[360px] xl:shrink-0">
        <section className="min-w-0 rounded-xl border border-line bg-surface shadow-card p-5 flex flex-col gap-2.5">
          <h2 className="text-base font-semibold">{t('cve.maturity')}</h2>
          {maturity.map((m) => (
            <div key={m.key} className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full" style={{ background: m.tone === 'critical' ? 'var(--critical)' : 'transparent', boxShadow: m.tone === 'critical' ? 'none' : 'inset 0 0 0 1.5px var(--ink-subtle)' }}
              />
              <span className="grow" style={{ color: m.tone === 'critical' ? 'var(--ink)' : 'var(--ink-muted)' }}>{t(m.key)}</span>
              <span className="text-[13px] font-medium" style={{ color: m.tone === 'critical' ? 'var(--critical-ink)' : 'var(--ink-muted)' }}>{t(m.value)}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

/* ---------- Timeline ---------- */
export function TimelineTab({ cve }: { cve: CveDetail }) {
  const { t } = useI18n();
  const events = buildTimeline(cve, t);
  return (
    <section className="flex w-full min-w-0 flex-col gap-1 rounded-xl border border-line bg-surface p-5 shadow-card">
      <h2 className="text-lg font-semibold pb-2">{t('cve.stream')}</h2>
      <TimelineList events={events} />
    </section>
  );
}

/* ---------- Affected assets: inventory matched against this CVE ---------- */
export function AssetsTab({ cveId }: { cveId: string }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const query = useCveAssets(cveId, can(P.VULN_READ));
  const age = useAgeMinutes();
  const [q, setQ] = useState('');
  const cols = { '--cols': '44px 190px 150px 140px 120px 80px 150px 120px 100px minmax(0, 1fr)' } as React.CSSProperties;
  const all = useMemo(() => (query.data?.items ?? []).map(toCveAssetRow), [query.data]);
  const rows = all.filter((r) => `${r.host} ${r.ip} ${r.owner ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const CVE_ASSET_STATS = query.data?.stats ?? { affected: 0, exposed: 0, open: 0, inProgress: 0, mitigated: 0 };
  const stats: { key: MessageKey; value: number; cls: string }[] = [
    { key: 'cve.assets.stat.affected', value: CVE_ASSET_STATS.affected, cls: 'ink' },
    { key: 'cve.assets.stat.exposed', value: CVE_ASSET_STATS.exposed, cls: 't-high' },
    { key: 'cve.assets.stat.open', value: CVE_ASSET_STATS.open, cls: 't-critical' },
    { key: 'cve.assets.stat.inProgress', value: CVE_ASSET_STATS.inProgress, cls: 't-accent' },
    { key: 'cve.assets.stat.mitigated', value: CVE_ASSET_STATS.mitigated, cls: 't-low' },
  ];
  if (!can(P.VULN_READ)) return <StateBlock kind="forbidden" title={t('common.noPermission')} description={t('common.noPermissionDesc')} />;
  if (query.isError) return <LoadError onRetry={() => void query.refetch()} />;
  if (query.isPending) return <LoadingRows />;
  if (all.length === 0) return <section className="rounded-xl border border-line bg-surface shadow-card"><StateBlock kind="empty" title={t('cve.assets.none.title')} description={t('cve.assets.none.desc')} /></section>;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid [grid-template-columns:repeat(auto-fit,_minmax(150px,_1fr))] gap-3">
        {stats.map((s) => (
          <div key={s.key} className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface px-4 py-3">
            <span className="text-sm font-medium">{t(s.key)}</span>
            <span className={`v ${s.cls}`}>{s.value}</span>
          </div>
        ))}
      </div>
      <section className="min-w-0 rounded-xl border border-line bg-surface shadow-card overflow-hidden flex flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
          <SearchInput shortcut={null} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('cve.assets.searchPlaceholder')} className="w-[260px]" />
          <span className="grow" />
        </div>
        <div className="overflow-x-auto">
          <div className="grid min-h-12 items-center gap-3 border-b border-line px-5 last:border-b-0 [grid-template-columns:var(--cols)] sticky top-0 z-1 h-10! min-h-0! bg-surface-2 text-sm font-medium text-ink-muted" style={cols}>
            <span>{t('vulns.col.risk')}</span><span>{t('assets.col.asset')}</span><span>OS</span><span>{t('cve.assets.col.installed')}</span><span>{t('cve.assets.col.target')}</span>
            <span>{t('assets.col.env')}</span><span>{t('vulns.col.status')}</span><span>{t('vulns.col.assignee')}</span><span>SLA</span><span>{t('cve.assets.col.source')}</span>
          </div>
          {rows.map((r) => (
            <div key={r.host} className="grid min-h-12 items-center gap-3 border-b border-line px-5 last:border-b-0 [grid-template-columns:var(--cols)] h-[46px]" style={{ ...cols }}>
              <RiskRing score={r.risk} />
              <span className="flex flex-col min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium">{r.host}</span>
                  {r.exposed ? <Icon name="globe" size={12} className="text-high-ink" aria-label={t('assets.exposed')} /> : null}
                </span>
                <span className="font-mono text-xs text-ink-muted">{r.ip}</span>
              </span>
              <span className="truncate text-[13px]">{r.os}</span>
              <span className="font-mono text-[13px] text-high-ink">{r.installed}</span>
              <span className="font-mono text-[13px] text-low-ink">{r.fixed}</span>
              <span><Tag>{r.env}</Tag></span>
              <StatusPill status={r.status} />
              <span className="text-[13px]" style={{ color: r.owner ? 'var(--ink)' : 'var(--ink-subtle)' }}>{r.owner ?? t('vulns.unassigned')}</span>
              <span>{r.slaHours != null ? <SlaChip hoursLeft={r.slaHours} /> : null}</span>
              <span className="truncate text-ink-muted text-[13px]">{r.source} · {age(r.seenMin)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 text-ink-muted py-2.5 px-4 text-[13px]">
          <span className="grow">{t('cve.assets.range', { from: 1, to: rows.length, total: CVE_ASSET_STATS.affected })}</span>
          <MonoText>{formatDate(new Date())}</MonoText>
        </div>
      </section>
    </div>
  );
}
