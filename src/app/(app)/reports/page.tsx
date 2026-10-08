'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { LoadError, LoadingRows } from '@/components/shell/query-state';
import { ReportDrawer, type Mode, type ReportRequest } from '@/components/reports/report-drawer';
import { Banner, Button, Icon, StateBlock, StatusPill, Tabs, Tag, Toggle, cx } from '@/components/ui';
import { useI18n, type MessageKey, type TFunction } from '@/i18n';
import { downloadReport, useReportMutations, useReportRuns, useReportSchedules } from '@/features/reports/hooks';
import { toRun, toSchedule } from '@/features/reports/map';
import { ApiError } from '@/lib/api';
import { useDemo } from '@/lib/demo';
import { PERMISSIONS as P } from '@/lib/permissions';
import { REPORT_TEMPLATES, nextRun, type Tone } from '@/lib/reports';
import { useAgeMinutes } from '@/lib/use-age';
import type { Format, ReportRun, ReportSchedule, TemplateId } from '@/mocks/reports';

const TONE: Record<Tone, string> = { accent: 'var(--chart-1)', critical: 'var(--critical)', high: 'var(--high)', medium: 'var(--medium)', low: 'var(--low)', teal: 'var(--chart-2)' };

const reportName = (t: TFunction, template: TemplateId, scope?: string) => `${t(`reports.name.${template}` as MessageKey)}${scope ? ` · ${scope}` : ''}`;

type DrawerState = { template: TemplateId; mode: Mode; schedule?: ReportSchedule } | null;

function TemplateCard({ id, canManage, onCreate, onSchedule }: { id: TemplateId; canManage: boolean; onCreate: () => void; onSchedule: () => void }) {
  const { t } = useI18n();
  const tpl = REPORT_TEMPLATES.find((x) => x.id === id)!;
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="flex h-20 items-end gap-1.5 rounded-lg bg-surface-2 px-3 pt-3" aria-hidden="true">
        {tpl.bars.map((b, i) => <span key={i} className="grow rounded-t-sm" style={{ height: `${b.h}%`, background: TONE[b.tone] }} />)}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">{t(`reports.name.${id}` as MessageKey)}</h3>
        <p className="m-0 text-[15px] text-ink-muted">{t(`reports.desc.${id}` as MessageKey)}</p>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-ink-muted">
        {[1, 2, 3].map((n) => (
          <li key={n} className="flex items-center gap-2"><Icon name="check" size={14} className="shrink-0 text-accent" />{t(`reports.inc.${id}.${n}` as MessageKey)}</li>
        ))}
      </ul>
      <p className="m-0 text-sm text-ink-subtle">{t('reports.aud.for', { who: t(`reports.aud.${tpl.audience}` as MessageKey) })}</p>
      {canManage ? (
        <div className="mt-auto flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={onCreate}>{t('reports.generate')}</Button>
          <Button size="sm" onClick={onSchedule}>{t('reports.scheduleBtn')}</Button>
        </div>
      ) : null}
    </section>
  );
}

function FormatLinks({ formats, onDownload }: { formats: Format[]; onDownload: (f: Format) => void }) {
  const { t } = useI18n();
  return (
    <span className="flex justify-end gap-2">
      {formats.map((f) => (
        <button key={f} type="button" onClick={() => onDownload(f)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium hover:bg-surface-2" aria-label={t('reports.download', { format: f.toUpperCase() })}>
          <Icon name="down" size={13} />
          {f.toUpperCase()}
        </button>
      ))}
    </span>
  );
}

function RunList({ runs, canManage, onDownload, onRetry }: { runs: ReportRun[]; canManage: boolean; onDownload: (id: string) => void; onRetry: (id: string) => void }) {
  const { t } = useI18n();
  const ageMin = useAgeMinutes();
  if (runs.length === 0) return <div className="rounded-xl border border-line bg-surface shadow-card"><StateBlock kind="empty" title={t('reports.run.empty')} description={t('reports.run.emptyDesc')} /></div>;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-card">
      <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
        <colgroup><col /><col className="w-[150px]" /><col className="w-[150px]" /><col className="w-[125px]" /><col className="w-[190px]" /></colgroup>
        <thead className="bg-surface-2 text-sm font-medium text-ink-muted">
          <tr><th className="px-5 py-3">{t('reports.col.report')}</th><th className="px-4 py-3">{t('reports.col.status')}</th><th className="px-4 py-3">{t('reports.col.created')}</th><th className="px-4 py-3">{t('reports.col.source')}</th><th className="px-5 py-3 text-right">{t('reports.col.output')}</th></tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-t border-line align-middle hover:bg-surface-2/60">
              <td className="px-5 py-3.5"><span className="flex min-w-0 items-center gap-3"><span className={cx('inline-flex size-9 shrink-0 items-center justify-center rounded-lg', r.status === 'failed' ? 'bg-critical-soft text-critical-ink' : r.status === 'generating' ? 'bg-surface-2 text-ink-muted' : 'bg-low-soft text-low-ink')}><Icon name={r.status === 'failed' ? 'alert' : r.status === 'generating' ? 'loader' : 'report'} size={17} spin={r.status === 'generating'} /></span><span className="min-w-0"><span className="block truncate font-medium">{reportName(t, r.template, r.scope)}</span><span className="block truncate text-sm text-ink-muted">{r.status === 'ready' ? r.size : r.status === 'failed' ? t('reports.run.failed') : t('reports.run.generating')}</span></span></span></td>
              <td className="px-4 py-3.5"><StatusPill status={r.status} /></td>
              <td className="px-4 py-3.5 text-sm text-ink-muted tabular-nums">{ageMin(r.min)}</td>
              <td className="px-4 py-3.5 text-sm text-ink-muted">{r.manual ? t('reports.run.manualShort') : t('reports.run.scheduledShort')}</td>
              <td className="px-5 py-3.5 text-right">{r.status === 'ready' ? <FormatLinks formats={r.formats} onDownload={() => onDownload(r.id)} /> : r.status === 'failed' && canManage ? <Button size="sm" icon="refresh" onClick={() => onRetry(r.id)}>{t('reports.retry')}</Button> : <span className="text-ink-subtle">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScheduleList({ items, canManage, onToggle, onEdit, onDelete }: { items: ReportSchedule[]; canManage: boolean; onToggle: (id: string, on: boolean) => void; onEdit: (s: ReportSchedule) => void; onDelete: (s: ReportSchedule) => void }) {
  const { t, locale } = useI18n();
  if (items.length === 0) return <div className="rounded-xl border border-line bg-surface shadow-card"><StateBlock kind="empty" title={t('reports.sched.empty')} description={t('reports.sched.emptyDesc')} /></div>;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-card">
      <table className="w-full min-w-[980px] table-fixed border-collapse text-left">
        <colgroup><col className="w-[88px]" /><col /><col className="w-[180px]" /><col className="w-[240px]" /><col className="w-[215px]" /><col className="w-[130px]" /></colgroup>
        <thead className="bg-surface-2 text-sm font-medium text-ink-muted"><tr><th className="px-4 py-3 text-center">{t('reports.col.active')}</th><th className="px-4 py-3">{t('reports.col.report')}</th><th className="px-4 py-3">{t('reports.col.frequency')}</th><th className="px-4 py-3">{t('reports.col.recipients')}</th><th className="px-4 py-3">{t('reports.col.next')}</th><th className="px-4 py-3 text-right">{t('reports.col.actions')}</th></tr></thead>
        <tbody>{items.map((s) => {
        const name = reportName(t, s.template, s.scope);
        const when = nextRun(s.freq).toLocaleString(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
        return (
          <tr key={s.id} className={cx('border-t border-line align-middle hover:bg-surface-2/60', !s.enabled && 'bg-surface-2/40 text-ink-muted')}>
            <td className="px-4 py-3.5 text-center"><Toggle checked={s.enabled} disabled={!canManage} onChange={(v) => onToggle(s.id, v)} aria-label={t('reports.sched.toggle', { name })} /></td>
            <td className="px-4 py-3.5"><span className="block truncate font-medium">{name}</span><span className="mt-0.5 block text-sm text-ink-muted">{s.formats.map((f) => f.toUpperCase()).join(' + ')}{!s.enabled ? ` · ${t('reports.sched.paused')}` : ''}</span></td>
            <td className="px-4 py-3.5 text-sm">{t(`reports.freq.${s.freq}` as MessageKey)}</td>
            <td className="px-4 py-3.5"><span className="block truncate text-sm text-ink-muted" title={s.recipients.join(', ')}>{s.recipients.join(', ')}</span></td>
            <td className="px-4 py-3.5 text-sm text-ink-muted tabular-nums">{s.enabled ? when : '—'}</td>
            <td className="px-4 py-3.5"><div className="flex justify-end gap-1">{canManage ? <><Button size="sm" onClick={() => onEdit(s)}>{t('reports.sched.edit')}</Button><Button size="sm" variant="ghost" icon="trash" aria-label={t('reports.sched.delete')} title={t('reports.sched.delete')} onClick={() => onDelete(s)} /></> : <span className="text-ink-subtle">—</span>}</div></td>
          </tr>
        );
      })}</tbody></table>
    </div>
  );
}

function Reports() {
  const { t } = useI18n();
  const demo = useDemo();
  const { can } = useAuth();
  const canManage = can(P.REPORT_MANAGE);
  const runsQ = useReportRuns();
  const schedulesQ = useReportSchedules();
  const m = useReportMutations();
  const runs = useMemo(() => (runsQ.data?.items ?? []).map(toRun), [runsQ.data]);
  const schedules = useMemo(() => (schedulesQ.data?.items ?? []).map(toSchedule), [schedulesQ.data]);
  const [tab, setTab] = useState<'recent' | 'scheduled'>('recent');
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'info' | 'error'; text: string } | null>(null);
  const failed = (e: unknown) => setNotice({ tone: 'error', text: e instanceof ApiError && e.code === 'LOCAL_PREVIEW' ? t('asset.err.demo') : t('common.tryAgainLater') });

  const submit = (req: ReportRequest) => {
    const scope = req.scope || null;
    const done = (text: string, next?: typeof tab) => ({ onSuccess: () => { setDrawer(null); if (next) setTab(next); setNotice({ tone: 'success' as const, text }); }, onError: failed });
    if (drawer?.schedule) {
      m.updateSchedule.mutate({ id: drawer.schedule.id, formats: req.formats as 'csv'[], freq: req.freq, recipients: req.recipients, scope }, done(t('reports.scheduled')));
    } else if (req.mode === 'schedule') {
      m.createSchedule.mutate({ template: req.template, scope, freq: req.freq, recipients: req.recipients, formats: req.formats as 'csv'[], enabled: true }, done(t('reports.scheduled'), 'scheduled'));
    } else {
      m.generate.mutate({ template: req.template, scope, formats: req.formats as 'csv'[], periodDays: req.period, recipients: req.recipients }, done(t('reports.created'), 'recent'));
    }
  };
  const download = (id: string) => downloadReport(id).catch(() => setNotice({ tone: 'error', text: demo ? t('asset.err.demo') : t('common.tryAgainLater') }));
  const busy = m.generate.isPending || m.createSchedule.isPending || m.updateSchedule.isPending;
  const loading = tab === 'recent' ? runsQ.isPending : schedulesQ.isPending;
  const errored = tab === 'recent' ? runsQ.isError : schedulesQ.isError;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] min-w-0 grow flex-col gap-6 p-4 md:p-8">
      <PageHeader title={t('reports.title')} subtitle={t('reports.subtitle')} actions={demo ? <Tag tone="accent">{t('common.demoData')}</Tag> : undefined} />

      <section aria-label={t('reports.templates')} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {REPORT_TEMPLATES.map((tpl) => (
          <TemplateCard key={tpl.id} id={tpl.id} canManage={canManage} onCreate={() => setDrawer({ template: tpl.id, mode: 'now' })} onSchedule={() => setDrawer({ template: tpl.id, mode: 'schedule' })} />
        ))}
      </section>

      {notice ? <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Banner> : null}

      <Tabs
        label={t('reports.tabs.label')}
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        items={[{ id: 'recent', label: t('reports.tab.recent'), count: runs.length }, { id: 'scheduled', label: t('reports.tab.scheduled'), count: schedules.length }]}
      />

      {errored ? (
        <div className="rounded-xl border border-line bg-surface shadow-card"><LoadError onRetry={() => void (tab === 'recent' ? runsQ : schedulesQ).refetch()} /></div>
      ) : loading ? (
        <div className="rounded-xl border border-line bg-surface shadow-card"><LoadingRows /></div>
      ) : tab === 'recent' ? (
        <RunList
          runs={runs}
          canManage={canManage}
          onDownload={download}
          onRetry={(id) => m.retry.mutate(id, { onSuccess: () => setNotice({ tone: 'info', text: t('reports.retryStarted') }), onError: failed })}
        />
      ) : (
        <ScheduleList
          items={schedules}
          canManage={canManage}
          onToggle={(id, on) => m.updateSchedule.mutate({ id, enabled: on }, { onError: failed })}
          onEdit={(s) => setDrawer({ template: s.template, mode: 'schedule', schedule: s })}
          onDelete={(s) => {
            if (window.confirm(t('reports.sched.deleteConfirm', { name: reportName(t, s.template, s.scope) }))) m.deleteSchedule.mutate(s.id, { onError: failed });
          }}
        />
      )}

      {drawer ? <ReportDrawer saving={busy} key={drawer.schedule?.id ?? `${drawer.template}-${drawer.mode}`} template={drawer.template} mode={drawer.mode} existing={drawer.schedule} onSubmit={submit} onClose={() => setDrawer(null)} /> : null}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <RequirePermission any={[P.REPORT_READ]}>
      <Reports />
    </RequirePermission>
  );
}
