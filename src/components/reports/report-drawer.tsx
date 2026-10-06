'use client';

import { useState } from 'react';
import { Drawer } from '@/components/admin/admin-parts';
import { Button, Select, TextField, cx } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { FORMATS, FREQS, PERIODS, parseRecipients } from '@/lib/reports';
import type { Format, Freq, ReportSchedule, TemplateId } from '@/mocks/reports';

export type Mode = 'now' | 'schedule';
export interface ReportRequest {
  template: TemplateId;
  mode: Mode;
  formats: Format[];
  period: number;
  freq: Freq;
  recipients: string[];
  scope: string;
}

/** Create a report right away or have it sent on a schedule; also edits an existing schedule. */
export function ReportDrawer({ template, mode: initialMode, existing, saving, onSubmit, onClose }: {
  template: TemplateId;
  saving?: boolean;
  mode: Mode;
  existing?: ReportSchedule;
  onSubmit: (r: ReportRequest) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [formats, setFormats] = useState<Format[]>(existing?.formats ?? ['csv']);
  const [period, setPeriod] = useState<number>(30);
  const [freq, setFreq] = useState<Freq>(existing?.freq ?? 'weekly-mon');
  const [recipients, setRecipients] = useState(existing?.recipients.join(', ') ?? '');
  const [scope, setScope] = useState(existing?.scope ?? '');
  const [showErrors, setShowErrors] = useState(false);

  const parsed = parseRecipients(recipients);
  const scheduling = mode === 'schedule';
  const errors = {
    format: formats.length === 0,
    recipients: !parsed.ok ? 'reports.err.recipients' : scheduling && parsed.list.length === 0 ? 'reports.err.recipientsReq' : null,
  } as const;
  const submit = () => {
    if (errors.format || errors.recipients) return setShowErrors(true);
    onSubmit({ template, mode, formats, period, freq, recipients: parsed.list, scope: scope.trim() });
  };
  const toggleFormat = (f: Format) => setFormats((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  return (
    <Drawer title={t(`reports.name.${template}` as MessageKey)} onClose={onClose}>
      <p className="text-[15px] text-ink-muted">{t(`reports.desc.${template}` as MessageKey)}</p>
      <div className="flex flex-col gap-6">
        {!existing ? (
          <div role="radiogroup" aria-label={t('reports.d.mode')} className="grid grid-cols-2 gap-2">
            {(['now', 'schedule'] as Mode[]).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={cx('h-11 rounded-xl border text-[15px] font-medium transition-colors', mode === m ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-ink-muted hover:text-ink')}>
                {t(`reports.d.mode.${m}` as MessageKey)}
              </button>
            ))}
          </div>
        ) : null}

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-sm font-medium">{t('reports.d.format')}</legend>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <button key={f} type="button" aria-pressed={formats.includes(f)} onClick={() => toggleFormat(f)} className={cx('h-10 rounded-full border px-4 text-[15px] font-medium transition-colors', formats.includes(f) ? 'border-transparent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink-muted hover:text-ink')}>
                {t(`reports.d.format.${f}` as MessageKey)}
              </button>
            ))}
          </div>
          {showErrors && errors.format ? <p role="alert" className="m-0 text-sm text-critical-ink">{t('reports.err.format')}</p> : null}
        </fieldset>

        {scheduling ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t('reports.d.freq')}</span>
            <Select aria-label={t('reports.d.freq')} value={freq} onChange={(v) => setFreq(v as Freq)} options={FREQS.map((f) => ({ value: f, label: t(`reports.freq.${f}` as MessageKey) }))} />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t('reports.d.period')}</span>
            <Select aria-label={t('reports.d.period')} value={String(period)} onChange={(v) => setPeriod(Number(v))} options={PERIODS.map((n) => ({ value: String(n), label: t('reports.d.period.n', { n }) }))} />
          </div>
        )}

        {template === 'owner' ? <TextField label={t('reports.d.scope')} hint={t('reports.d.scope.hint')} value={scope} onChange={(e) => setScope(e.target.value)} /> : null}

        <TextField
          label={scheduling ? t('reports.d.recipients') : t('reports.d.recipientsOpt')}
          hint={t('reports.d.recipients.hint')}
          error={showErrors && errors.recipients ? t(errors.recipients) : undefined}
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          inputMode="email"
        />
      </div>
      <div className="sticky bottom-0 -mx-6 -mb-6 mt-auto flex items-center gap-2 border-t border-line bg-surface px-6 py-4">
        <span className="grow" />
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" icon="check" loading={saving} onClick={submit}>
          {existing ? t('reports.d.submit.save') : t(scheduling ? 'reports.d.submit.schedule' : 'reports.d.submit.now')}
        </Button>
      </div>
    </Drawer>
  );
}
