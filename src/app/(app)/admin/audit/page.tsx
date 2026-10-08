'use client';

import { useMemo, useState } from 'react';
import { AuditFeed } from '@/components/admin/audit-feed';
import { AuditFilterPanel } from '@/components/admin/audit-filter-panel';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { Button, SearchInput, Skeleton, StateBlock, cx } from '@/components/ui';
import { useAudit } from '@/features/admin/hooks';
import { useI18n } from '@/i18n';
import { matchesFilter, type ActivityFilter } from '@/lib/activity';
import { actionLabel, actorOf, matchesSearch, rangeBounds, summarizeAudit, targetOf, type RangeKey } from '@/lib/audit';
import { formatDate } from '@/lib/format';
import { PERMISSIONS as P } from '@/lib/permissions';
import type { AuditEntry } from '@/lib/types';

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
        <SearchInput size="lg" shortcut={null} className="w-full shadow-card" placeholder={t('auditlog.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <AuditFilterPanel
          category={category}
          range={range}
          custom={custom}
          action={action}
          onCategoryChange={setCategory}
          onRangeChange={setRange}
          onCustomChange={setCustom}
          onActionChange={setAction}
          onClear={() => { setAction(''); setRange('all'); setCustom({ from: '', to: '' }); setCategory('all'); }}
        />
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
