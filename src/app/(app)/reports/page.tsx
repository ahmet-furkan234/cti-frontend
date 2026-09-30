'use client';

import { PageHeader } from '@/components/shell/page-guard';
import { Button, StatusPill, Tag } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { REPORT_RUNS, REPORT_SCHEDULES, REPORT_TEMPLATES } from '@/mocks/reports';

const TONE = { accent: 'var(--chart-1)', critical: 'var(--critical)', high: 'var(--high)', medium: 'var(--medium)', low: 'var(--low)', teal: 'var(--chart-2)' } as const;
const SCHED_COLS = { '--cols': 'minmax(0, 1fr) 160px 110px 90px' } as React.CSSProperties;
const RUN_COLS = { '--cols': 'minmax(0, 1fr) 140px 80px 130px' } as React.CSSProperties;

export default function ReportsPage() {
  const { t } = useI18n();
  const name = (id: string) => t(`reports.name.${id}` as MessageKey);
  return (
    <div className="page">
      <PageHeader
        title={t('reports.title')}
        actions={
          <>
            <Tag tone="accent">{t('common.demoData')}</Tag>
            <Button>{t('reports.addSchedule')}</Button>
          </>
        }
      />
      <div className="col gap-8">
        <span className="caps">{t('reports.templates')}</span>
        <div className="grid grid-4">
          {REPORT_TEMPLATES.map((tpl) => (
            <section key={tpl.id} className="card card--pad col" style={{ gap: 10 }}>
              <div style={{ height: 88, borderRadius: 6, background: 'var(--surface-2)', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ width: '40%', height: 6, borderRadius: 2, background: 'var(--border-strong)' }} />
                <div className="row" style={{ gap: 4, alignItems: 'flex-end', flexGrow: 1 }}>
                  {tpl.bars.map((b, i) => (
                    <span key={i} style={{ flexGrow: 1, borderRadius: '2px 2px 0 0', height: `${b.h}%`, background: TONE[b.tone] }} />
                  ))}
                </div>
              </div>
              <div className="col" style={{ gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{name(tpl.id)}</span>
                <span className="sub">{t(`reports.desc.${tpl.id}` as MessageKey)}</span>
              </div>
              <div className="row gap-6">
                <Tag>{t(`reports.aud.${tpl.audience}` as MessageKey)}</Tag>
                <span className="grow" />
                <Button size="sm" variant="primary">{t('reports.generate')}</Button>
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <section className="card card--clip">
          <div className="card-head"><h2 className="h3">{t('reports.schedules')}</h2></div>
          <div className="scroll-x">
            <div className="trow trow--head" style={SCHED_COLS}>
              <span>{t('reports.col.reportTo')}</span><span>{t('reports.col.frequency')}</span><span>{t('reports.col.next')}</span><span>{t('reports.col.status')}</span>
            </div>
            {REPORT_SCHEDULES.map((s) => (
              <div key={s.name} className="trow" style={{ ...SCHED_COLS, height: 48, borderTop: '1px solid var(--border)' }}>
                <span className="col min0">
                  <span style={{ fontWeight: 500 }}>{name(s.name)}</span>
                  <span className="sub" style={{ lineHeight: '14px' }}>{s.to}</span>
                </span>
                <span style={{ fontSize: 12 }}>{t(`reports.freq.${s.freq}` as MessageKey)}</span>
                <span className="mono-12 muted">{s.next}</span>
                <StatusPill status={s.status} label={s.status === 'healthy' ? t('status.active') : t('reports.paused')} />
              </div>
            ))}
          </div>
        </section>
        <section className="card card--clip">
          <div className="card-head"><h2 className="h3">{t('reports.runs')}</h2></div>
          <div className="scroll-x">
            <div className="trow trow--head" style={RUN_COLS}>
              <span>{t('reports.col.report')}</span><span>{t('reports.col.created')}</span><span>{t('reports.col.size')}</span><span className="right">{t('reports.col.download')}</span>
            </div>
            {REPORT_RUNS.map((r, i) => (
              <div key={i} className="trow" style={{ ...RUN_COLS, height: 44, borderTop: '1px solid var(--border)' }}>
                <span className="row min0" style={{ gap: 8 }}>
                  <span className="ellipsis" style={{ fontWeight: 500 }}>{name(r.name)}</span>
                  {r.failed ? <StatusPill status="failing" /> : null}
                </span>
                <span className="mono-12 muted">{r.at}</span>
                <span className="mono-12 muted">{r.size}</span>
                <span className="row right" style={{ justifyContent: 'flex-end', gap: 6 }}>
                  {r.failed ? (
                    <a href="#" style={{ fontSize: 12 }} onClick={(e) => e.preventDefault()}>{t('common.retry')}</a>
                  ) : (
                    <>
                      <a href="#" className="mono-12" onClick={(e) => e.preventDefault()}>PDF</a>
                      <span className="subtle">·</span>
                      <a href="#" className="mono-12" onClick={(e) => e.preventDefault()}>CSV</a>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
