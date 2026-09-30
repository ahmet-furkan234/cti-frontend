'use client';

import { useMemo, useState } from 'react';
import { AuditRows, actionLabel } from '@/components/admin/audit-rows';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { Button, Skeleton, StateBlock, TextField } from '@/components/ui';
import { useAudit } from '@/features/admin/hooks';
import { useI18n } from '@/i18n';
import { PERMISSIONS as P } from '@/lib/permissions';
import { formatDate } from '@/lib/format';
import { AUDIT_ACTIONS } from '@/lib/audit-actions';
import type { AuditEntry } from '@/lib/types';

function csvCell(v: unknown): string {
  const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv(rows: AuditEntry[]) {
  const head = ['at', 'actor', 'action', 'targetType', 'targetId', 'ip', 'meta'];
  const lines = rows.map((r) => [r.at, r.actorEmail, r.action, r.targetType, r.targetId, r.ip, r.meta].map(csvCell).join(','));
  const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `audit-${formatDate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function AuditView() {
  const { t } = useI18n();
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const filters = useMemo(
    () => ({
      ...(action ? { action } : {}),
      ...(from ? { from: new Date(`${from}T00:00:00`).toISOString() } : {}),
      ...(to ? { to: new Date(`${to}T23:59:59`).toISOString() } : {}),
    }),
    [action, from, to],
  );
  const audit = useAudit(filters);
  const items = audit.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="page">
      <PageHeader
        title={t('audit.title')}
        subtitle={t('audit.subtitle')}
        actions={<Button icon="copy" disabled={items.length === 0} onClick={() => exportCsv(items)}>{t('common.exportCsv')}</Button>}
      />
      <div className="row gap-12 wrap" style={{ alignItems: 'flex-end' }}>
        <div className="cti-field">
          <label className="cti-field__label" htmlFor="audit-action">{t('audit.f.action')}</label>
          <select id="audit-action" className="cti-select" style={{ height: 32, minWidth: 260 }} value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">{t('audit.f.allActions')}</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>{actionLabel(t, a)} — {a}</option>
            ))}
          </select>
        </div>
        <TextField label={t('audit.f.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField label={t('audit.f.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      <section className="card card--clip">
        {audit.isPending ? (
          <div style={{ padding: 16 }}><Skeleton lines={6} height={12} /></div>
        ) : audit.isError ? (
          <StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={() => void audit.refetch()}>{t('common.retry')}</Button>} />
        ) : items.length === 0 ? (
          <StateBlock kind="empty" title={t('audit.empty')} />
        ) : (
          <>
            <AuditRows items={items} showHeader />
            <div className="row gap-12 muted" style={{ padding: '12px 16px', fontSize: 12 }}>
              <span className="grow">{audit.hasNextPage ? '' : t('audit.allLoaded', { n: items.length })}</span>
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
