'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Stepper } from '@/components/assets/stepper';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { Banner, Button, Checkbox, Icon, Select, StatusPill, Tag, buttonClass, cx, type IconName } from '@/components/ui';
import { useImportAssets, useImportHistory } from '@/features/assets/hooks';
import { useI18n, type MessageKey } from '@/i18n';
import { ApiError } from '@/lib/api';
import { useDemo } from '@/lib/demo';
import { FIELD_OPTIONS, SAMPLE_CSV, autoMap, buildRows, parseCsv, parseNmap, parseSbom, type ImportField, type Table } from '@/lib/import';
import { PERMISSIONS as P } from '@/lib/permissions';
import type { ImportResult } from '@/lib/types';

const STEPS = ['source', 'mapping', 'validation', 'confirm'] as const;
type Source = 'csv' | 'nmap' | 'sbom';
const SOURCES: { id: Source; icon: IconName; accept: string }[] = [
  { id: 'csv', icon: 'report', accept: '.csv,.txt' },
  { id: 'nmap', icon: 'globe', accept: '.xml' },
  { id: 'sbom', icon: 'container', accept: '.json' },
];
const KIND: Record<Source, string> = { csv: 'CSV', nmap: 'Nmap XML', sbom: 'SBOM' };
const MAX_BYTES = 25 * 1024 * 1024;

interface Loaded {
  name: string;
  size: number;
  table: Table;
}

/** Reads and parses a file in the browser; the API only ever sees the rows. */
async function load(source: Source, name: string, size: number, text: string): Promise<Loaded> {
  const table = source === 'csv' ? parseCsv(text) : source === 'nmap' ? parseNmap(text) : parseSbom(text);
  if (table.rows.length === 0) throw new Error('empty');
  return { name, size, table };
}

const card = 'min-w-0 rounded-xl border border-line bg-surface shadow-card';
const fmtSize = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/* ---- step 1 */
function SourceStep({ source, setSource, file, setFile }: {
  source: Source;
  setSource: (s: Source) => void;
  file: Loaded | null;
  setFile: (f: Loaded | null) => void;
}) {
  const { t, lang } = useI18n();
  const history = useImportHistory();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);

  const take = async (f?: File | null) => {
    if (!f) return;
    setError(null);
    if (f.size > MAX_BYTES) return setError('import.err.size');
    try {
      setFile(await load(source, f.name, f.size, await f.text()));
    } catch (e) {
      setFile(null);
      setError(e instanceof Error && e.message === 'empty' ? 'import.err.empty' : 'import.err.format');
    }
  };
  const useSample = () => {
    setSource('csv');
    setError(null);
    void load('csv', 'inventory_sample.csv', SAMPLE_CSV.length, SAMPLE_CSV).then(setFile);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t('import.src.title')}</h2>
        <div role="radiogroup" aria-label={t('import.src.title')} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {SOURCES.map((s) => {
            const on = s.id === source;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => { setSource(s.id); setFile(null); setError(null); }}
                className={cx('flex items-start gap-3 rounded-xl border p-4 text-left transition-colors', on ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong')}
              >
                <span className={cx('inline-flex size-10 shrink-0 items-center justify-center rounded-lg', on ? 'bg-accent text-on-accent' : 'bg-surface-2 text-ink-muted')}>
                  <Icon name={s.icon} size={20} />
                </span>
                <span className="flex flex-col">
                  <span className="font-semibold">{t(`import.src.${s.id}` as MessageKey)}</span>
                  <span className="text-sm text-ink-muted">{t(`import.src.${s.id}.desc` as MessageKey)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); void take(e.dataTransfer.files[0]); }}
        className={cx('flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors', over ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface')}
      >
        <input ref={input} type="file" hidden accept={SOURCES.find((s) => s.id === source)!.accept} onChange={(e) => { void take(e.target.files?.[0]); e.target.value = ''; }} />
        {file ? (
          <>
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-low-soft text-low-ink"><Icon name="check" size={28} strokeWidth={2.25} /></span>
            <div>
              <div className="text-lg font-semibold">{file.name}</div>
              <div className="text-sm text-ink-muted">{t('import.drop.ready')} · {fmtSize(file.size)} · {t('import.val.rows', { n: file.table.rows.length })}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => input.current?.click()}>{t('import.drop.replace')}</Button>
          </>
        ) : (
          <>
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-surface-2 text-ink-muted"><Icon name="up" size={28} /></span>
            <div className="text-lg font-semibold">{t('import.drop.title')}</div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-ink-muted">
              {t('import.drop.or')}
              <Button size="sm" onClick={() => input.current?.click()}>{t('import.drop.browse')}</Button>
            </div>
            <div className="text-sm text-ink-subtle">{t('import.drop.hint')}</div>
            <button type="button" className="text-sm font-medium text-accent hover:underline" onClick={useSample}>
              {t('import.drop.sample')}
            </button>
          </>
        )}
        {error ? <p role="alert" className="m-0 text-sm text-critical-ink">{t(error)}</p> : null}
      </section>

      <section className={cx(card, 'overflow-hidden')}>
        <h2 className="px-5 py-4 text-base font-semibold">{t('import.history')}</h2>
        {history.data?.items.length === 0 ? <p className="m-0 border-t border-line px-5 py-6 text-center text-sm text-ink-muted">{t('import.history.empty')}</p> : null}
        {history.data?.items.map((h) => (
          <div key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-5 py-3">
            <span className="min-w-0 grow truncate font-medium">{h.source}</span>
            <span className="text-sm text-ink-muted">{h.kind} · {new Date(h.createdAt).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')} · {t('import.history.detail', { created: h.created, updated: h.updated })}</span>
            <StatusPill status={h.status} />
          </div>
        ))}
      </section>
    </div>
  );
}

/* ---- step 2 */
function MappingStep({ table, fields, setFields }: { table: Table; fields: Record<string, ImportField | ''>; setFields: (f: Record<string, ImportField | ''>) => void }) {
  const { t } = useI18n();
  const auto = useMemo(() => autoMap(table.columns), [table]);
  const mapped = table.columns.filter((c) => fields[c]).length;
  const sample = (i: number) => table.rows.map((r) => r[i] ?? '').find((v) => v !== '') ?? '';
  return (
    <section className={cx(card, 'overflow-hidden')}>
      <div className="flex flex-wrap items-end gap-3 px-6 py-5">
        <div className="grow">
          <h2 className="text-lg font-semibold">{t('import.map.title')}</h2>
          <p className="text-[15px] text-ink-muted">{t('import.map.desc')}</p>
        </div>
        <Tag tone={mapped === table.columns.length ? 'accent' : 'neutral'}>{t('import.map.count', { n: mapped, total: table.columns.length })}</Tag>
      </div>
      <div className="hidden grid-cols-[1fr_28px_1fr_1fr] items-center gap-3 border-y border-line bg-surface-2 px-6 py-2.5 text-sm font-medium text-ink-muted md:grid">
        <span>{t('import.map.fileCol')}</span><span /><span>{t('import.map.field')}</span><span>{t('import.map.sample')}</span>
      </div>
      {table.columns.map((col, i) => {
        const value = fields[col] ?? '';
        const isAuto = value !== '' && value === auto[col];
        return (
          <div key={`${col}-${i}`} className="grid grid-cols-1 items-center gap-2 border-b border-line px-6 py-3 last:border-b-0 md:grid-cols-[1fr_28px_1fr_1fr] md:gap-3">
            <span className="flex items-center gap-2 font-medium">{col || `#${i + 1}`}</span>
            <Icon name="down" size={16} className="hidden -rotate-90 text-ink-subtle md:block" />
            <div className="flex items-center gap-2">
              <Select
                className="grow"
                aria-label={t('import.col.fieldFor', { col })}
                value={value}
                onChange={(v) => setFields({ ...fields, [col]: v as ImportField | '' })}
                options={[{ value: '', label: t('import.unmapped') }, ...FIELD_OPTIONS.map((o) => ({ value: o, label: t(`import.field.${o}` as MessageKey) }))]}
              />
              {isAuto ? <Tag tone="accent">{t('import.map.auto')}</Tag> : null}
            </div>
            <span className="truncate font-mono text-sm text-ink-muted" title={sample(i)}>{sample(i)}</span>
          </div>
        );
      })}
    </section>
  );
}

/* ---- step 3 */
type Filter = 'all' | 'error' | 'warning';
function ValidationStep({ check, loading, error, skipBad, setSkipBad }: { check: ImportResult | null; loading: boolean; error: string | null; skipBad: boolean; setSkipBad: (v: boolean) => void }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>('all');
  if (error) return <Banner tone="error">{error}</Banner>;
  if (loading || !check) return <div className={cx(card, 'p-8 text-center text-ink-muted')} role="status">{t('import.checking')}</div>;
  const totals = check.totals;
  const issues = check.issues.filter((i) => filter === 'all' || i.level === filter);
  const tiles: { id: Filter | 'ok'; n: number; label: MessageKey; tone: string }[] = [
    { id: 'ok', n: totals.valid - totals.warnings < 0 ? 0 : totals.valid - totals.warnings, label: 'import.val.ok', tone: 'bg-low-soft text-low-ink' },
    { id: 'warning', n: totals.warnings, label: 'import.val.warn', tone: 'bg-medium-soft text-medium-ink' },
    { id: 'error', n: totals.errors, label: 'import.val.err', tone: 'bg-critical-soft text-critical-ink' },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold">{t('import.val.title')}</h2>
        <p className="text-[15px] text-ink-muted">{t('import.val.rows', { n: totals.rows })}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {tiles.map((x) => (
          <button
            key={x.id}
            type="button"
            disabled={x.id === 'ok'}
            aria-pressed={filter === x.id}
            onClick={() => setFilter((f) => (f === x.id ? 'all' : (x.id as Filter)))}
            className={cx('flex items-center gap-4 rounded-xl border p-4 text-left transition-colors disabled:cursor-default', filter === x.id ? 'border-ink-muted' : 'border-line', 'bg-surface')}
          >
            <span className={cx('inline-flex size-12 items-center justify-center rounded-xl text-xl font-semibold tabular-nums', x.tone)}>{x.n}</span>
            <span className="font-medium">{t(x.label)}</span>
          </button>
        ))}
      </div>

      <section className={cx(card, 'overflow-hidden')}>
        {issues.length === 0 ? <p className="px-6 py-8 text-center text-ink-muted">{t('import.val.none')}</p> : null}
        {issues.map((i) => (
          <div key={`${i.row}-${i.message}`} className="flex items-start gap-3 border-b border-line px-5 py-3.5 last:border-b-0">
            <span className={cx('mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full', i.level === 'error' ? 'bg-critical-soft text-critical-ink' : 'bg-medium-soft text-medium-ink')}>
              <Icon name={i.level === 'error' ? 'x' : 'alert'} size={14} />
            </span>
            <div className="min-w-0 grow">
              <div className="font-medium">{t(`import.msg.${i.message}` as MessageKey)}</div>
              <div className="text-sm text-ink-muted">
                {t('import.row', { n: i.row })} · <span className="font-mono">{i.value}</span>
              </div>
            </div>
            <span className={cx('shrink-0 text-sm font-medium', i.level === 'error' ? 'text-critical-ink' : 'text-medium-ink')}>{t(i.level === 'error' ? 'import.level.error' : 'import.level.warning')}</span>
          </div>
        ))}
      </section>

      {totals.errors > 0 ? (
        <Banner tone="warning" title={t('import.val.errNote')}>
          <label className="mt-2 flex cursor-pointer items-center gap-2 font-medium text-ink">
            <Checkbox checked={skipBad} onChange={(e) => setSkipBad(e.target.checked)} />
            {t('import.val.skip')}
          </label>
        </Banner>
      ) : null}
    </div>
  );
}

/* ---- step 4 */
function ConfirmStep({ phase, check, result, error, onReset }: { phase: 'review' | 'running' | 'done'; check: ImportResult | null; result: ImportResult | null; error: string | null; onReset: () => void }) {
  const { t } = useI18n();
  const x = (result ?? check)?.totals;
  if (!x) return null;
  const total = x.created + x.updated;
  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-low-soft text-low-ink"><Icon name="check" size={32} strokeWidth={2.25} /></span>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('import.done.title', { n: total })}</h2>
          <p className="mt-1 text-[15px] text-ink-muted">{t('import.done.matching')}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={onReset}>{t('import.done.another')}</Button>
          <Link href="/assets" className={buttonClass('primary')}>{t('import.done.view')}</Link>
        </div>
      </div>
    );
  }
  const rows: { n: number; label: MessageKey; desc: MessageKey; tone: string }[] = [
    { n: x.created, label: 'import.sum.new', desc: 'import.sum.new.desc', tone: 'text-low-ink' },
    { n: x.updated, label: 'import.sum.update', desc: 'import.sum.update.desc', tone: 'text-accent' },
    { n: x.skipped, label: 'import.sum.skip', desc: 'import.sum.skip.desc', tone: 'text-ink-muted' },
    { n: x.software, label: 'import.sum.software', desc: 'import.sum.software.desc', tone: 'text-ink' },
  ];
  return (
    <section className={cx(card, 'overflow-hidden')}>
      <div className="px-6 py-5">
        <h2 className="text-lg font-semibold">{t('import.confirm.title')}</h2>
        <p className="text-[15px] text-ink-muted">{t('import.confirm.desc')}</p>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-4 border-t border-line px-6 py-4">
          <span className={cx('w-16 text-right text-2xl font-semibold tabular-nums', r.tone)}>{r.n.toLocaleString()}</span>
          <div>
            <div className="font-medium">{t(r.label)}</div>
            <div className="text-sm text-ink-muted">{t(r.desc)}</div>
          </div>
        </div>
      ))}
      {phase === 'running' ? <div className="border-t border-line px-6 py-5 text-sm font-medium" role="status">{t('import.running')}</div> : null}
      {error ? <div className="border-t border-line px-6 py-4"><Banner tone="error">{error}</Banner></div> : null}
    </section>
  );
}

/* ---- wizard */
function ImportWizard() {
  const { t } = useI18n();
  const demo = useDemo();
  const importer = useImportAssets();
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<Source>('csv');
  const [file, setFile] = useState<Loaded | null>(null);
  const [fields, setFields] = useState<Record<string, ImportField | ''>>({});
  const [skipBad, setSkipBad] = useState(false);
  const [phase, setPhase] = useState<'review' | 'running' | 'done'>('review');
  const [check, setCheck] = useState<ImportResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rowsBody = useMemo(() => (file ? buildRows(file.table, fields, source === 'csv' ? 2 : 1) : []), [file, fields, source]);
  const explain = (e: unknown) => (e instanceof ApiError && e.code === 'LOCAL_PREVIEW' ? t('asset.err.demo') : t('common.tryAgainLater'));

  const chooseFile = (f: Loaded | null) => {
    setFile(f);
    setFields(f ? autoMap(f.table.columns) : {});
    setCheck(null);
    setSkipBad(false);
  };

  // Entering the validation step asks the API what it would do with the mapped rows, without saving anything.
  useEffect(() => {
    if (step !== 2 || !file) return;
    setCheck(null);
    setError(null);
    importer.mutate({ source: file.name, kind: KIND[source], rows: rowsBody, dryRun: true, skipInvalid: false }, { onSuccess: setCheck, onError: (e) => setError(explain(e)) });
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = () => {
    if (!file) return;
    setPhase('running');
    setError(null);
    importer.mutate(
      { source: file.name, kind: KIND[source], rows: rowsBody, dryRun: false, skipInvalid: skipBad },
      { onSuccess: (r) => { setResult(r); setPhase('done'); }, onError: (e) => { setError(explain(e)); setPhase('review'); } },
    );
  };

  const hasIdentity = Object.values(fields).some((v) => v === 'hostname' || v === 'ip_address');
  const errors = check?.totals.errors ?? 0;
  const block: MessageKey | null =
    step === 0 ? null : step === 1 && !hasIdentity ? 'import.map.needId' : step === 2 && (!check || (errors > 0 && !skipBad)) ? (check ? 'import.val.needSkip' : 'import.checking') : null;
  const canNext = step === 0 ? !!file : !block;
  const finished = phase !== 'review';
  const importable = check ? check.totals.created + check.totals.updated : 0;

  return (
    <div className="mx-auto flex w-full max-w-[960px] min-w-0 grow flex-col gap-6 p-4 md:p-8">
      <nav className="text-sm text-ink-muted [&_a]:text-ink-muted [&_a:hover]:text-ink" aria-label="breadcrumb">
        <Link href="/assets">{t('assets.title')}</Link> / {t('import.breadcrumb')}
      </nav>
      <PageHeader title={t('import.title')} subtitle={t('import.subtitle')} actions={demo ? <Tag tone="accent">{t('common.demoData')}</Tag> : undefined} />
      <Stepper
        label={t('import.steps')}
        current={step}
        onJump={finished ? undefined : setStep}
        steps={STEPS.map((id) => ({ id, label: t(`import.step.${id}` as MessageKey), hint: t(`import.step.${id}.desc` as MessageKey) }))}
      />

      <div>
        {step === 0 ? <SourceStep source={source} setSource={setSource} file={file} setFile={chooseFile} /> : null}
        {step === 1 && file ? <MappingStep table={file.table} fields={fields} setFields={setFields} /> : null}
        {step === 2 ? <ValidationStep check={check} loading={importer.isPending} error={error} skipBad={skipBad} setSkipBad={setSkipBad} /> : null}
        {step === 3 ? <ConfirmStep phase={phase} check={check} result={result} error={error} onReset={() => { setStep(0); chooseFile(null); setPhase('review'); setResult(null); }} /> : null}
      </div>

      {phase !== 'done' ? (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-canvas/95 px-4 py-4 backdrop-blur md:mx-0 md:rounded-xl md:border md:bg-surface md:px-5">
          <Button variant="ghost" disabled={step === 0 || phase === 'running'} onClick={() => setStep((s) => s - 1)}>{t('common.back')}</Button>
          <span className="grow text-sm text-ink-muted">{block ? t(block) : t('import.stepOf', { n: step + 1, total: STEPS.length })}</span>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>{t('import.next')}</Button>
          ) : (
            <Button variant="primary" icon="check" disabled={importable === 0} loading={phase === 'running'} onClick={run}>
              {phase === 'running' ? t('import.running') : t('import.run', { n: importable })}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function ImportWizardPage() {
  return (
    <RequirePermission any={[P.ASSET_WRITE]}>
      <ImportWizard />
    </RequirePermission>
  );
}
