'use client';

import { useMemo, useState } from 'react';
import { AuditFeed } from '@/components/admin/audit-feed';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { Button, SearchInput, Select, Skeleton, StateBlock, TextField, cx } from '@/components/ui';
import { useAudit } from '@/features/admin/hooks';
import { useI18n, type MessageKey } from '@/i18n';
import { matchesFilter, type ActivityFilter } from '@/lib/activity';
import { AUDIT_ACTIONS } from '@/lib/audit-actions';
import { RANGES, actionLabel, actorOf, matchesSearch, rangeBounds, summarizeAudit, targetOf, type RangeKey } from '@/lib/audit';
import { formatDate } from '@/lib/format';
import { PERMISSIONS as P } from '@/lib/permissions';
import type { AuditEntry } from '@/lib/types';

const CATEGORIES: ActivityFilter[] = ['all', 'account', 'access', 'security'];

function csvCell(v: unknown): string {
  const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv(rows: AuditEntry[]) {
  const head = ['at', 'actor', 'action', 'target', 'ip', 'meta'];
  const lines = rows.map((r) => [r.at, actorOf(r), r.action, targetOf(r), r.ip, r.meta].map(csvCell).join(','));
  const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `audit-${formatDate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Tile({ label, sub, value, on, onClick, tone }: { label: string; sub: string; value: number; on?: boolean; onClick?: () => void; tone?: string }) {
  const body = (
    <>
      <span className="text-sm text-ink-muted">{label}</span>
      <span className={cx('text-3xl leading-9 font-semibold tabular-nums', value > 0 && tone)}>{value}</span>
      <span className="text-sm text-ink-subtle">{sub}</span>
    </>
  );
  const cls = 'flex min-w-0 flex-col gap-0.5 rounded-xl border bg-surface px-5 py-4 text-left shadow-card transition-colors';
  return onClick ? (
    <button type="button" aria-pressed={on} onClick={onClick} className={cx(cls, on ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong')}>{body}</button>
  ) : (
    <div className={cx(cls, 'border-line')}>{body}</div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cx('inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-[15px] font-medium transition-colors', on ? 'border-transparent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink-muted hover:text-ink')}>
      {children}
    </button>
  );
}

function AuditView() {
  const { t } = useI18n();
  const [action, setAction] = useState('');
  const [range, setRange] = useState<RangeKey>('all');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [category, setCategory] = useState<ActivityFilter>('all');
  const [q, setQ] = useState('');

  const bounds = useMemo(() => rangeBounds(range, custom), [range, custom]);
  const filters = useMemo(() => ({ ...(action ? { action } : {}), ...bounds }), [action, bounds]);
  const audit = useAudit(filters);
  const all = useMemo(() => audit.data?.pages.flatMap((p) => p.items) ?? [], [audit.data]);
  const items = useMemo(() => all.filter((e) => matchesFilter(e, category) && matchesSearch(e, q, actionLabel(t, e.action))), [all, category, q, t]);
  const sum = useMemo(() => summarizeAudit(all), [all]);
  const filtered = !!(action || range !== 'all' || category !== 'all' || q.trim());
  const reset = () => { setAction(''); setRange('all'); setCustom({ from: '', to: '' }); setCategory('all'); setQ(''); };

  return (
    <div className="mx-auto flex w-full max-w-[1100px] min-w-0 grow flex-col gap-5 p-4 md:p-8">
      <PageHeader
        title={t('audit.title')}
        subtitle={t('auditlog.subtitle')}
        actions={<Button icon="copy" disabled={items.length === 0} onClick={() => exportCsv(items)}>{t('common.exportCsv')}</Button>}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Tile label={t('auditlog.tile.total')} sub={t('auditlog.tile.total.sub')} value={sum.total} on={category === 'all'} onClick={() => setCategory('all')} />
        <Tile label={t('auditlog.tile.alerts')} sub={t('auditlog.tile.alerts.sub')} value={sum.alerts} on={category === 'security'} onClick={() => setCategory(category === 'security' ? 'all' : 'security')} tone="text-high-ink" />
        <Tile label={t('auditlog.tile.access')} sub={t('auditlog.tile.access.sub')} value={sum.accessChanges} on={category === 'access'} onClick={() => setCategory(category === 'access' ? 'all' : 'access')} />
        <Tile label={t('auditlog.tile.people')} sub={t('auditlog.tile.people.sub')} value={sum.people} />
      </div>

      <div className="flex flex-col gap-3">
        <SearchInput shortcut={null} className="w-full md:max-w-lg" placeholder={t('auditlog.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          <div className="flex gap-2" role="group" aria-label={t('audit.title')}>
            {CATEGORIES.map((c) => <Chip key={c} on={category === c} onClick={() => setCategory(c)}>{t(`auditlog.cat.${c}` as MessageKey)}</Chip>)}
          </div>
          <span className="mx-1 hidden w-px self-stretch bg-line md:block" aria-hidden="true" />
          <div className="flex gap-2" role="group" aria-label={t('auditlog.f.range')}>
            {RANGES.map((r) => <Chip key={r} on={range === r} onClick={() => setRange(r)}>{t(`auditlog.range.${r}` as MessageKey)}</Chip>)}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {range === 'custom' ? (
            <>
              <TextField label={t('auditlog.from')} type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
              <TextField label={t('auditlog.to')} type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
            </>
          ) : null}
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">{t('auditlog.f.action')}</span>
            <Select
              size="sm"
              className="min-w-[280px]"
              aria-label={t('auditlog.f.action')}
              value={action}
              onChange={setAction}
              options={[{ value: '', label: t('auditlog.f.allActions') }, ...AUDIT_ACTIONS.map((a) => ({ value: a, label: actionLabel(t, a), hint: a }))]}
            />
          </div>
          {filtered ? <Button size="sm" variant="ghost" onClick={reset}>{t('auditlog.clear')}</Button> : null}
        </div>
      </div>

      <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-card" aria-busy={audit.isPending}>
        {audit.isPending ? (
          <div className="p-5"><Skeleton lines={6} height={14} /></div>
        ) : audit.isError ? (
          <StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={() => void audit.refetch()}>{t('common.retry')}</Button>} />
        ) : items.length === 0 ? (
          all.length === 0 && !filtered ? (
            <StateBlock kind="empty" title={t('audit.empty')} />
          ) : (
            <StateBlock kind="no-results" title={t('auditlog.empty')} description={audit.hasNextPage ? t('auditlog.emptyMore') : t('auditlog.emptyHint')} action={filtered ? <Button onClick={reset}>{t('auditlog.clear')}</Button> : undefined} />
          )
        ) : (
          <>
            <AuditFeed items={items} />
            <div className="flex items-center gap-3 border-t border-line px-5 py-3.5 text-sm text-ink-muted">
              <span className="grow">{audit.hasNextPage ? t('auditlog.results', { n: items.length }) : t('audit.allLoaded', { n: all.length })}</span>
              {audit.hasNextPage ? <Button size="sm" loading={audit.isFetchingNextPage} onClick={() => void audit.fetchNextPage()}>{t('audit.loadMore')}</Button> : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default function AuditPage() {
  return (
    <RequirePermission any={[P.AUDIT_READ]}>
      <AuditView />
    </RequirePermission>
  );
}
