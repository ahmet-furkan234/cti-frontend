'use client';

import { useMemo, useState } from 'react';
import { Button, MonoText, RiskRing, SearchInput, SlaChip, StatusPill, Tag, Icon } from '@/components/ui';
import { DemoNotice } from '@/components/shell/demo-notice';
import { useI18n, type MessageKey } from '@/i18n';
import { formatDate } from '@/lib/format';
import { useAgeMinutes } from '@/lib/use-age';
import type { CveDetail } from '@/lib/types';
import { CVE_ASSET_ROWS, CVE_ASSET_STATS } from '@/mocks/cve-assets';
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
    <div className="split">
      <section className="card card--clip main col">
        <div className="card-toolbar">
          {(['all', ...groups] as const).map((g) => (
            <button key={g} type="button" className={`filter-chip${filter === g ? ' is-on' : ''}`} onClick={() => setFilter(g)}>
              {t(g === 'all' ? 'cve.refs.all' : (`cve.refs.${g}` as MessageKey))}
              <span className="mono-11" style={{ opacity: 0.8 }}>{g === 'all' ? cve.references.length : byGroup[g].length}</span>
            </button>
          ))}
          <span className="grow" />
          <Button size="sm" variant="ghost" onClick={() => void navigator.clipboard?.writeText(cve.references.map((r) => r.url).join('\n'))}>
            {t('cve.refs.copyAll')}
          </Button>
        </div>
        {cve.references.length === 0 ? <div className="muted" style={{ padding: 16 }}>{t('cve.refs.empty')}</div> : null}
        {groups
          .filter((g) => (filter === 'all' || filter === g) && byGroup[g].length > 0)
          .map((g) => (
            <div key={g}>
              <div className="trow trow--group">
                <span style={{ width: 8, height: 8, borderRadius: 2, background: GROUP_COLOR[g] }} />
                {t(`cve.refs.${g}` as MessageKey)}
                <span className="subtle" style={{ fontWeight: 400 }}>{byGroup[g].length}</span>
              </div>
              {byGroup[g].map((r) => (
                <div key={r.url} className="trow" style={{ ...cols, minHeight: 52, padding: '6px 16px' }}>
                  <span className="col min0">
                    <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="ellipsis" style={{ fontSize: 13, lineHeight: '18px', fontWeight: 500 }}>
                      {displayUrl(r.url)}
                    </a>
                    {r.source ? <span className="mono-11 muted ellipsis" style={{ lineHeight: '16px' }}>{r.source}</span> : null}
                  </span>
                  <span className="row gap-4 wrap">{(r.tags ?? []).map((tag) => <Tag key={tag}>{tag}</Tag>)}</span>
                  <button type="button" className="icon-btn" aria-label={t('common.copy')} onClick={() => void navigator.clipboard?.writeText(r.url)}>
                    <Icon name="copy" size={13} />
                  </button>
                </div>
              ))}
            </div>
          ))}
      </section>
      <div className="col gap-16 aside-360">
        <section className="card card--pad col" style={{ gap: 10 }}>
          <h2 className="h3">{t('cve.maturity')}</h2>
          {maturity.map((m) => (
            <div key={m.key} className="row" style={{ gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 9999,
                  background: m.tone === 'critical' ? 'var(--critical)' : 'transparent',
                  boxShadow: m.tone === 'critical' ? 'none' : 'inset 0 0 0 1.5px var(--ink-subtle)',
                }}
              />
              <span className="grow" style={{ color: m.tone === 'critical' ? 'var(--ink)' : 'var(--ink-muted)' }}>{t(m.key)}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: m.tone === 'critical' ? 'var(--critical-ink)' : 'var(--ink-muted)' }}>{t(m.value)}</span>
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
    <section className="card card--pad col" style={{ gap: 4, maxWidth: 720 }}>
      <h2 className="h2" style={{ paddingBottom: 8 }}>{t('cve.stream')}</h2>
      <TimelineList events={events} />
    </section>
  );
}

/* ---------- Affected assets (demo data until the inventory module exists) ---------- */
export function AssetsTab() {
  const { t } = useI18n();
  const age = useAgeMinutes();
  const [q, setQ] = useState('');
  const cols = { '--cols': '44px 190px 150px 140px 120px 80px 150px 120px 100px minmax(0, 1fr)' } as React.CSSProperties;
  const rows = CVE_ASSET_ROWS.filter((r) => `${r.host} ${r.ip} ${r.owner ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const stats: { key: MessageKey; value: number; cls: string }[] = [
    { key: 'cve.assets.stat.affected', value: CVE_ASSET_STATS.affected, cls: 'ink' },
    { key: 'cve.assets.stat.exposed', value: CVE_ASSET_STATS.exposed, cls: 't-high' },
    { key: 'cve.assets.stat.open', value: CVE_ASSET_STATS.open, cls: 't-critical' },
    { key: 'cve.assets.stat.inProgress', value: CVE_ASSET_STATS.inProgress, cls: 't-accent' },
    { key: 'cve.assets.stat.mitigated', value: CVE_ASSET_STATS.mitigated, cls: 't-low' },
  ];
  return (
    <div className="col gap-16">
      <DemoNotice />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {stats.map((s) => (
          <div key={s.key} className="stat-box">
            <span className="caps">{t(s.key)}</span>
            <span className={`v ${s.cls}`}>{s.value}</span>
          </div>
        ))}
      </div>
      <section className="card card--clip col">
        <div className="card-toolbar">
          <SearchInput shortcut={null} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('cve.assets.searchPlaceholder')} style={{ width: 260 }} />
          <span className="grow" />
        </div>
        <div className="scroll-x">
          <div className="trow trow--head" style={cols}>
            <span>{t('vulns.col.risk')}</span><span>{t('assets.col.asset')}</span><span>OS</span><span>{t('cve.assets.col.installed')}</span><span>{t('cve.assets.col.target')}</span>
            <span>{t('assets.col.env')}</span><span>{t('vulns.col.status')}</span><span>{t('vulns.col.assignee')}</span><span>SLA</span><span>{t('cve.assets.col.source')}</span>
          </div>
          {rows.map((r) => (
            <div key={r.host} className="trow" style={{ ...cols, height: 46 }}>
              <RiskRing score={r.risk} />
              <span className="col min0">
                <span className="row gap-6">
                  <span className="mono-12" style={{ fontWeight: 500 }}>{r.host}</span>
                  {r.exposed ? <Icon name="globe" size={12} style={{ color: 'var(--high-ink)' }} aria-label={t('assets.exposed')} /> : null}
                </span>
                <span className="mono-11 muted" style={{ lineHeight: '14px' }}>{r.ip}</span>
              </span>
              <span className="ellipsis" style={{ fontSize: 12 }}>{r.os}</span>
              <span className="mono-12 t-high">{r.installed}</span>
              <span className="mono-12 t-low">{r.fixed}</span>
              <span><Tag>{r.env}</Tag></span>
              <StatusPill status={r.status} />
              <span style={{ fontSize: 12, color: r.owner ? 'var(--ink)' : 'var(--ink-subtle)' }}>{r.owner ?? t('vulns.unassigned')}</span>
              <span>{r.slaHours != null ? <SlaChip hoursLeft={r.slaHours} /> : null}</span>
              <span className="ellipsis muted" style={{ fontSize: 12 }}>{r.source} · {age(r.seenMin)}</span>
            </div>
          ))}
        </div>
        <div className="row gap-12 muted" style={{ padding: '10px 16px', fontSize: 12 }}>
          <span className="grow">{t('cve.assets.range', { from: 1, to: rows.length, total: CVE_ASSET_STATS.affected })}</span>
          <MonoText>{formatDate(new Date())}</MonoText>
        </div>
      </section>
    </div>
  );
}
