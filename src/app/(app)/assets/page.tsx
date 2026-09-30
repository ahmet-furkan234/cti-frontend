'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shell/page-guard';
import { Button, Icon, RiskRing, SearchInput, StatusPill, Tabs, Tag, buttonClass } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { useAgeMinutes } from '@/lib/use-age';
import { ASSET_ICON, ASSET_ROWS, ASSET_TYPE_TABS, EXPOSURE, OPENSSH_VERSIONS, TAB_TYPES } from '@/mocks/assets';

const COLS = { '--cols': '28px 170px 130px 76px 70px 96px 44px 124px 84px 84px minmax(0, 1fr)' } as React.CSSProperties;
const CRIT_COLOR = { critical: 'var(--critical-ink)', high: 'var(--high-ink)', medium: 'var(--ink)', low: 'var(--ink-muted)' } as const;

export default function AssetsPage() {
  const { t, locale } = useI18n();
  const age = useAgeMinutes();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');

  const rows = useMemo(() => {
    const types = TAB_TYPES[tab];
    const term = q.trim().toLowerCase();
    return ASSET_ROWS.filter((r) => (!types || types.includes(r.type)) && (!term || `${r.host} ${r.ip} ${r.os}`.toLowerCase().includes(term)));
  }, [tab, q]);
  const maxCount = Math.max(...OPENSSH_VERSIONS.map((v) => v.count));

  return (
    <div className="page">
      <PageHeader
        title={t('assets.title')}
        subtitle={t('assets.subtitle', { total: formatNumber(2418, locale), active: formatNumber(2201, locale), stale: 164, archived: 53 })}
        actions={
          <>
            <Tag tone="accent">{t('common.demoData')}</Tag>
            <SearchInput shortcut={null} style={{ width: 320 }} placeholder={t('assets.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} />
            <Button icon="copy">{t('common.export')}</Button>
            <Link href="/assets/import" className={buttonClass('primary')}>{t('assets.import')}</Link>
          </>
        }
      />

      <div className="grid grid-3">
        <section className="card card--pad col span-2" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 10 }}>
            <h2 className="h3">{t('assets.dist.title')}</h2>
            <Tag tone="accent">{t('assets.dist.tag')}</Tag>
            <span className="grow" />
            <span className="sub">{t('assets.dist.meta', { assets: 312, versions: 9 })}</span>
          </div>
          {OPENSSH_VERSIONS.map((v) => (
            <div key={v.version} className="grid" style={{ gridTemplateColumns: '110px minmax(0, 1fr) 56px 150px', gap: 12, alignItems: 'center' }}>
              <span className="mono-12">{v.version === '__other__' ? t('assets.dist.other', { n: 4 }) : v.version}</span>
              <span style={{ height: 10, background: 'var(--surface-2)', borderRadius: 2 }}>
                <span style={{ display: 'block', height: 10, borderRadius: 2, width: `${Math.round((v.count / maxCount) * 100)}%`, background: v.vulnerable ? 'var(--high)' : 'var(--chart-2)' }} />
              </span>
              <span className="mono-12 right">{v.count}</span>
              <span style={{ fontSize: 11, color: v.vulnerable ? 'var(--high-ink)' : 'var(--ink-muted)' }}>{v.note}</span>
            </div>
          ))}
        </section>
        <section className="card card--pad col gap-12">
          <h2 className="h3">{t('assets.exposure.title')}</h2>
          {(
            [
              ['assets.exposure.internet', EXPOSURE.internet],
              ['assets.exposure.kev', EXPOSURE.kev],
              ['assets.exposure.stale', EXPOSURE.stale],
              ['assets.exposure.unowned', EXPOSURE.unowned],
            ] as [MessageKey, number][]
          ).map(([k, v]) => (
            <div key={k} className="row" style={{ gap: 10 }}>
              <span className="grow muted">{t(k)}</span>
              <span className="tnum" style={{ fontSize: 18, lineHeight: '24px', fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </section>
      </div>

      <section className="card card--clip col">
        <div className="card-toolbar">
          <Tabs label={t('assets.tabs.label')} value={tab} onChange={setTab} items={ASSET_TYPE_TABS.map((x) => ({ id: x.id, label: t(`assets.tab.${x.id}` as MessageKey), count: formatNumber(x.count, locale) }))} />
          <span className="grow" />
          <Button size="sm" variant="ghost">{t('assets.filter.env')}</Button>
          <Button size="sm" variant="ghost">{t('assets.filter.criticality')}</Button>
          <Button size="sm" variant="ghost">{t('assets.filter.status')}</Button>
        </div>
        <div className="scroll-x">
          <div className="trow trow--head" style={COLS}>
            <span /><span>{t('assets.col.hostIp')}</span><span>OS</span><span>{t('assets.col.criticality')}</span><span>{t('assets.col.env')}</span>
            <span>{t('assets.col.exposure')}</span><span>{t('assets.col.risk')}</span><span>{t('assets.col.vulns')}</span><span>{t('assets.col.status')}</span><span>{t('assets.col.seen')}</span><span>{t('assets.col.source')}</span>
          </div>
          {rows.map((r) => (
            <div key={r.host} className="trow" style={{ ...COLS, height: 44 }}>
              <span title={t(`assets.type.${r.type}` as MessageKey)} className="avatar" style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface-2)', color: 'var(--ink-muted)' }}>
                <Icon name={ASSET_ICON[r.type]} size={15} />
              </span>
              <span className="col min0">
                <span className="mono-12" style={{ lineHeight: '16px', fontWeight: 500, color: 'var(--accent)' }}>{r.host}</span>
                <span className="mono-11 muted" style={{ lineHeight: '14px' }}>{r.ip}</span>
              </span>
              <span className="ellipsis" style={{ fontSize: 12 }}>{r.os}</span>
              <span style={{ fontSize: 12, color: CRIT_COLOR[r.crit] }}>{t(`sev.${r.crit}` as MessageKey)}</span>
              <span><Tag>{r.env}</Tag></span>
              <span>{r.exposed ? <Tag tone="exposed" icon="globe">{t('assets.internet')}</Tag> : null}</span>
              <RiskRing score={r.risk} />
              <span className="row mono-12" style={{ gap: 6 }}>
                <span className="t-critical" style={{ width: 22 }}>{r.counts[0]}</span>
                <span className="t-high" style={{ width: 22 }}>{r.counts[1]}</span>
                <span className="t-medium" style={{ width: 22 }}>{r.counts[2]}</span>
                <span className="muted" style={{ width: 22 }}>{r.counts[3]}</span>
              </span>
              <StatusPill status={r.status} />
              <span className="muted" style={{ fontSize: 12 }}>{age(r.seenMin)}</span>
              <span className="muted" style={{ fontSize: 12 }}>{r.source === 'manual' ? t('assets.src.manual') : r.source}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
