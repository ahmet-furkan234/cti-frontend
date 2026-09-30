'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/shell/page-guard';
import { Button, Checkbox, StatusPill, Tag } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { FIELD_OPTIONS, IMPORT_HISTORY, IMPORT_ISSUES, MAPPING_ROWS } from '@/mocks/import';

const CURRENT_STEP = 2;
const STEPS: { id: 'source' | 'mapping' | 'validation' | 'confirm' }[] = [{ id: 'source' }, { id: 'mapping' }, { id: 'validation' }, { id: 'confirm' }];
const MAP_COLS = { '--cols': '180px 24px 240px minmax(0, 1fr)' } as React.CSSProperties;
const ISSUE_COLS = { '--cols': '80px 90px 190px minmax(0, 1fr)' } as React.CSSProperties;

export default function ImportWizardPage() {
  const { t, lang } = useI18n();
  const [skipBad, setSkipBad] = useState(true);
  const [fields, setFields] = useState<Record<string, string>>(Object.fromEntries(MAPPING_ROWS.map((r) => [r.column, r.field])));
  const mapped = MAPPING_ROWS.filter((r) => fields[r.column]).length;

  return (
    <div className="page page--tight">
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link href="/assets">{t('assets.title')}</Link> / {t('import.breadcrumb')}
      </nav>
      <PageHeader
        title={t('import.title')}
        actions={
          <>
            <Tag tone="accent">{t('common.demoData')}</Tag>
            <span className="mono-12 muted">inventory_q3.xlsx · {t('import.fileMeta', { rows: 452, cols: 11 })}</span>
          </>
        }
      />
      <ol aria-label={t('import.steps')} className="grid grid-4" style={{ margin: 0, padding: 0, listStyle: 'none', gap: 8 }}>
        {STEPS.map((s, i) => {
          const done = i < CURRENT_STEP;
          const active = i === CURRENT_STEP;
          return (
            <li key={s.id} className="row" style={{ gap: 10, padding: '10px 12px', background: active ? 'var(--accent-soft)' : 'var(--surface)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)' }}>
              <span
                className="mono"
                style={{
                  flexShrink: 0, width: 24, height: 24, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600,
                  ...(active ? { background: 'var(--accent)', color: 'var(--on-accent)' } : done ? { background: 'var(--low-soft)', color: 'var(--low-ink)' } : { background: 'var(--surface-3)', color: 'var(--ink-muted)' }),
                }}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className="col">
                <span style={{ fontWeight: 500 }}>{t(`import.step.${s.id}` as MessageKey)}</span>
                <span className="sub">{t(`import.step.${s.id}.desc` as MessageKey)}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="split">
        <div className="col gap-16 main">
          <section className="card card--clip">
            <div className="card-head">
              <h2 className="h3 grow">{t('import.mapping')}</h2>
              <span className="sub">{t('import.mapping.auto', { n: mapped, total: MAPPING_ROWS.length })}</span>
            </div>
            <div className="scroll-x">
              <div className="trow trow--head" style={MAP_COLS}>
                <span>{t('import.col.file')}</span><span /><span>{t('import.col.field')}</span><span>{t('import.col.sample')}</span>
              </div>
              {MAPPING_ROWS.map((m) => (
                <div key={m.column} className="trow" style={{ ...MAP_COLS, height: 40 }}>
                  <span className="mono-12">{m.column}</span>
                  <span className="subtle">→</span>
                  <select
                    className="cti-select"
                    aria-label={t('import.col.fieldFor', { col: m.column })}
                    value={fields[m.column] ?? ''}
                    onChange={(e) => setFields((f) => ({ ...f, [m.column]: e.target.value }))}
                    style={fields[m.column] ? undefined : { borderColor: 'var(--high)' }}
                  >
                    <option value="">{t('import.unmapped')}</option>
                    {FIELD_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                    {fields[m.column] && !FIELD_OPTIONS.includes(fields[m.column]!) ? <option value={fields[m.column]}>{fields[m.column]}</option> : null}
                  </select>
                  <span className="mono-12 muted ellipsis">{m.sample}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card card--clip">
            <div className="card-head" style={{ gap: 12 }}>
              <h2 className="h3 grow">{t('import.validation')}</h2>
              <StatusPill status="healthy" label={t('import.valid', { n: 438 })} />
              <StatusPill status="degraded" label={t('import.warnings', { n: 11 })} />
              <StatusPill status="failing" label={t('import.errors', { n: 3 })} />
            </div>
            <div className="scroll-x">
              {IMPORT_ISSUES.map((i) => (
                <div key={i.row} className="trow" style={{ ...ISSUE_COLS, height: 38, borderTop: '1px solid var(--border)' }}>
                  <span className="mono-12 muted">{t('import.row', { n: i.row })}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: i.level === 'error' ? 'var(--critical-ink)' : 'var(--high-ink)' }}>{t(i.level === 'error' ? 'import.level.error' : 'import.level.warning')}</span>
                  <span className="mono-12">{i.value}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{t(`import.msg.${i.message}` as MessageKey)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="col gap-16 aside-320">
          <section className="card card--pad col" style={{ gap: 10 }}>
            <h2 className="h3">{t('import.summary')}</h2>
            {(
              [
                ['import.sum.new', 412],
                ['import.sum.update', 37],
                ['import.sum.skip', 3],
                ['import.sum.software', '1,906'],
              ] as [MessageKey, number | string][]
            ).map(([k, v]) => (
              <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">{t(k)}</span>
                <span className="mono">{v}</span>
              </div>
            ))}
            <label className="row muted" style={{ fontSize: 12 }}>
              <Checkbox checked={skipBad} onChange={(e) => setSkipBad(e.target.checked)} />
              {t('import.skipBad')}
            </label>
            <div className="row" style={{ paddingTop: 4 }}>
              <Button style={{ flexGrow: 1 }}>{t('common.back')}</Button>
              <Button variant="primary" style={{ flexGrow: 1 }}>{t('import.submit', { n: 449 })}</Button>
            </div>
          </section>
          <section className="card card--clip col grow">
            <div className="card-head"><h2 className="h3">{t('import.history')}</h2></div>
            {IMPORT_HISTORY.map((h) => (
              <div key={h.source} className="col" style={{ gap: 2, padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                <div className="row">
                  <span className="grow ellipsis" style={{ fontSize: 12, fontWeight: 500 }}>{h.source}</span>
                  <StatusPill status={h.status} />
                </div>
                <span className="sub">{h.kind} · {h.date} · {h.detail[lang]}</span>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
