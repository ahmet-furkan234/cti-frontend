'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shell/page-guard';
import { Button, MonoText, SearchInput, Tag } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { ATTACK_PATTERN, ATTACK_TACTICS, ATTACK_TOP, IOCS, WATCHLISTS } from '@/mocks/intel';

const COLS = { '--cols': '80px minmax(0, 1fr) 150px 130px 110px 100px' } as React.CSSProperties;
const LEVELS = ['var(--surface-2)', 'var(--accent-soft)', 'color-mix(in srgb, var(--chart-1) 55%, var(--surface))', 'var(--chart-1)'];

function confidenceColor(c: number) {
  return c >= 80 ? 'var(--critical)' : c >= 50 ? 'var(--high)' : 'var(--medium)';
}

export default function IntelPage() {
  const { t, locale } = useI18n();
  const [q, setQ] = useState('');
  const iocs = useMemo(() => {
    const term = q.trim().toLowerCase();
    return IOCS.filter((i) => !term || `${i.type} ${i.value} ${i.source}`.toLowerCase().includes(term));
  }, [q]);

  return (
    <div className="page">
      <PageHeader
        title={t('intel.title')}
        actions={
          <>
            <Tag tone="accent">{t('common.demoData')}</Tag>
            <Button>{t('intel.importIoc')}</Button>
            <Button variant="primary">{t('intel.newWatchlist')}</Button>
          </>
        }
      />

      <div className="grid grid-4">
        {WATCHLISTS.map((w) => (
          <section key={w.name} className="card col" style={{ gap: 8, padding: '14px 16px' }}>
            <div className="row">
              <span className="grow" style={{ fontWeight: 600 }}>{w.name}</span>
              {w.hits > 0 ? (
                <span className="mono" style={{ padding: '0 6px', borderRadius: 9999, background: 'var(--critical-soft)', color: 'var(--critical-ink)', fontSize: 11, fontWeight: 600 }}>
                  {t('intel.newHits', { n: w.hits })}
                </span>
              ) : null}
            </div>
            <span className="sub">{w.rule}</span>
            <div className="row subtle" style={{ gap: 12, fontSize: 11 }}>
              <span>{t('intel.assets', { n: formatNumber(w.count, locale) })}</span>
              <span>·</span>
              <span>{w.channel}</span>
            </div>
          </section>
        ))}
      </div>

      <div className="split">
        <section className="card card--clip main col">
          <div className="card-toolbar">
            <h2 className="h3">{t('intel.iocs')}</h2>
            <span className="sub">{t('intel.iocsActive', { n: formatNumber(18442, locale) })}</span>
            <span className="grow" />
            <SearchInput shortcut={null} style={{ width: 260 }} placeholder={t('intel.iocSearch')} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="scroll-x">
            <div className="trow trow--head" style={COLS}>
              <span>{t('intel.col.type')}</span><span>{t('intel.col.value')}</span><span>{t('intel.col.source')}</span>
              <span>{t('intel.col.confidence')}</span><span>{t('intel.col.expires')}</span><span className="right">{t('intel.col.matches')}</span>
            </div>
            {iocs.map((i) => (
              <div key={`${i.type}-${i.value}`} className="trow" style={{ ...COLS, height: 40 }}>
                <span><Tag>{i.type}</Tag></span>
                <MonoText copy truncate>{i.value}</MonoText>
                <span className="muted" style={{ fontSize: 12 }}>{i.source}</span>
                <span className="row" style={{ gap: 8 }}>
                  <span style={{ width: 56, height: 4, borderRadius: 9999, background: 'var(--surface-3)', overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: 4, width: `${i.confidence}%`, background: confidenceColor(i.confidence) }} />
                  </span>
                  <span className="mono-12">{i.confidence}</span>
                </span>
                <span className="mono-12" style={{ color: i.expired ? 'var(--ink-subtle)' : 'var(--ink-muted)' }}>{i.expires}</span>
                <span className="mono-12 right" style={{ color: i.matches ? 'var(--critical-ink)' : 'var(--ink-subtle)' }}>
                  {i.matches ? t('intel.matchAssets', { n: i.matches }) : '—'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card card--pad col aside-380" style={{ gap: 10 }}>
          <div className="row">
            <h2 className="h3 grow">{t('intel.attack.title')}</h2>
            <Tag tone="accent">{t('intel.attack.phase')}</Tag>
          </div>
          <span className="sub">{t('intel.attack.desc')}</span>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 3 }}>
            {ATTACK_TACTICS.map((x) => (
              <span key={x} className="subtle" style={{ fontSize: 9, lineHeight: '12px', height: 24, overflow: 'hidden' }}>{x}</span>
            ))}
            {ATTACK_PATTERN.map((p, i) => (
              <span key={i} title={`T${i + 1}`} style={{ height: 28, borderRadius: 3, background: LEVELS[p] }} />
            ))}
          </div>
          <div className="row muted" style={{ gap: 6, fontSize: 11 }}>
            <span>{t('intel.attack.less')}</span>
            {LEVELS.map((c, i) => (
              <span key={i} style={{ width: 16, height: 10, borderRadius: 2, background: c }} />
            ))}
            <span>{t('intel.attack.more')}</span>
          </div>
          <div className="col gap-6" style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <span className="caps">{t('intel.attack.top')}</span>
            {ATTACK_TOP.map((x) => (
              <div key={x.id} className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
                <span><span className="mono">{x.id}</span> {x.name}</span>
                <span className="mono">{x.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
