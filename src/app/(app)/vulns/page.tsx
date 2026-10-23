'use client';

import { PAGE_CONTAINER } from '@/components/shell/page-layout';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { ExplainPopover, type ExplainTarget } from '@/components/vulns/explain';
import { FindingsTable } from '@/components/vulns/findings-table';
import { VulnFilterPanel } from '@/components/vulns/filter-panel';
import { Banner, Button, Icon, KevFlag, RiskRing, SearchInput, Select, SeverityBadge, StateBlock, Tag, cx } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { useAuth } from '@/components/auth-provider';
import { useSetVulnStatus, useVulns } from '@/features/vulns/hooks';
import { toVulnItem, type VulnItem } from '@/features/vulns/map';
import { useDemo } from '@/lib/demo';
import { PERMISSIONS as P } from '@/lib/permissions';
import { ApiError } from '@/lib/api';
import {
  filterVulns, groupVulns, isVulnFiltered, noVulnFilters, statusCounts,
  isOverdue, type VulnSort, type GroupBy, type VulnGroup,
} from '@/lib/vulns';
import { riskOf, type VulnStatus } from '@/mocks/vulns';
import { LoadError, LoadingRows } from '@/components/shell/query-state';

const STATUSES: VulnStatus[] = ['open', 'in_progress', 'mitigated', 'accepted'];

function Tile({ label, sub, value, on, onClick, tone }: { label: string; sub: string; value: number; on: boolean; onClick: () => void; tone?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cx('flex min-w-0 flex-col gap-0.5 rounded-xl border bg-surface px-4 py-3 text-left shadow-card transition-colors', on ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong')}>
      <span className="text-sm text-ink-muted">{label}</span>
      <span className={cx('text-2xl leading-8 font-semibold tabular-nums', value > 0 && tone)}>{value}</span>
      <span className="text-sm text-ink-subtle">{sub}</span>
    </button>
  );
}

function StatusSelect({ value, onChange, name, disabled }: { value: VulnStatus; onChange: (s: VulnStatus) => void; name: string; disabled?: boolean }) {
  const { t } = useI18n();
  return (
    <Select
      size="sm"
      className="w-44"
      aria-label={t('vulns.status.change', { name })}
      disabled={disabled}
      value={value}
      onChange={(v) => onChange(v as VulnStatus)}
      options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}` as MessageKey) }))}
    />
  );
}

function MatchRow({ r, by, onStatus, onExplain, canEdit }: { r: VulnItem; by: GroupBy; onStatus: (s: VulnStatus) => void; onExplain: (e: React.MouseEvent<HTMLButtonElement>) => void; canEdit: boolean }) {
  const { t } = useI18n();
  const risk = riskOf(r);
  const name = by === 'cve' ? r.host : r.cve;
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-t border-line px-5 py-3.5 md:grid-cols-[auto_minmax(0,1fr)_176px]">
      <button type="button" aria-label={t('vulns.why', { score: risk })} title={t('vulns.why', { score: risk })} onClick={onExplain} className="rounded-full">
        <RiskRing score={risk} size={40} />
      </button>
      <div className="flex min-w-0 flex-col">
        {by === 'cve' ? (
          <>
            <span className="truncate font-medium">{r.host}</span>
            <span className="text-sm text-ink-muted">{t(`env.${r.env}` as MessageKey)} · {r.exposed ? t('vulns.exposed') : t('vulns.internal')}</span>
          </>
        ) : (
          <>
            <span className="flex flex-wrap items-center gap-2">
              <Link href={`/cves/${r.cve}`} className="font-mono text-[15px] font-semibold">{r.cve}</Link>
              {r.kev ? <KevFlag /> : null}
              <SeverityBadge score={r.cvss} />
            </span>
            <span className="text-sm text-ink-muted">{t('vulns.g.fix', { fix: r.fix })}</span>
          </>
        )}
      </div>
      <div className="col-span-2 md:col-span-1"><StatusSelect value={r.status} onChange={onStatus} name={name} disabled={!canEdit} /></div>
    </div>
  );
}

function GroupCard({ g, open, onToggle, onSetAll, onStatus, onExplain, canEdit }: {
  g: VulnGroup<VulnItem>; open: boolean; onToggle: () => void; canEdit: boolean;
  onSetAll: (s: VulnStatus) => void; onStatus: (r: VulnItem, s: VulnStatus) => void; onExplain: (r: VulnItem, e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { t } = useI18n();
  const head = g.rows[0]!;
  const fixes = new Set(g.rows.map((r) => r.fix));
  const sub =
    g.by === 'cve'
      ? `${t('vulns.g.assets', { n: g.rows.length })} · ${fixes.size === 1 ? t('vulns.g.fix', { fix: head.fix }) : t('vulns.g.fixes', { n: fixes.size })}`
      : `${t(`env.${head.env}` as MessageKey)} · ${head.exposed ? t('vulns.exposed') : t('vulns.internal')} · ${t('vulns.g.vulns', { n: g.rows.length })}`;
  return (
    <li className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-surface-2">
        <RiskRing score={g.risk} size={48} />
        <span className="flex min-w-0 grow flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={cx('text-base font-semibold', g.by === 'cve' && 'font-mono')}>{g.key}</span>
            {g.by === 'cve' && head.kev ? <KevFlag /> : null}
            {g.by === 'cve' ? <SeverityBadge score={head.cvss} /> : null}
          </span>
          <span className="truncate text-sm text-ink-muted">{sub}</span>
        </span>
        <Icon name="down" size={18} className={cx('shrink-0 text-ink-subtle transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <>
          <div className={cx('flex flex-wrap items-center gap-3 border-t border-line bg-surface-2/60 px-5', g.by === 'cve' || g.rows.length > 1 ? 'py-3' : 'hidden')}>
            {g.by === 'cve' ? <Link href={`/cves/${g.key}`} className="text-sm font-medium">{t('vulns.cveLink')}</Link> : null}
            <span className="grow" />
            {g.rows.length > 1 && canEdit ? (
              <>
                <span className="text-sm text-ink-muted">{t('vulns.g.setAll')}</span>
                <Select
                  size="sm"
                  className="w-44"
                  aria-label={`${t('vulns.g.setAll')}: ${g.key}`}
                  value=""
                  placeholder={t('vulns.g.setAll')}
                  onChange={(v) => onSetAll(v as VulnStatus)}
                  options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}` as MessageKey) }))}
                />
              </>
            ) : null}
          </div>
          {g.rows.map((r) => <MatchRow key={r.id} r={r} canEdit={canEdit} by={g.by} onStatus={(s) => onStatus(r, s)} onExplain={(e) => onExplain(r, e)} />)}
        </>
      ) : null}
    </li>
  );
}

function Vulns() {
  const { t } = useI18n();
  const demo = useDemo();
  const { can } = useAuth();
  const canEdit = can(P.VULN_UPDATE);
  const query = useVulns();
  const setStatus = useSetVulnStatus();
  const rows = useMemo(() => (query.data?.items ?? []).map(toVulnItem), [query.data]);
  const [filters, setFilters] = useState(noVulnFilters);
  const [by, setBy] = useState<GroupBy | 'table'>('table');
  const [sort, setSort] = useState<VulnSort>('risk');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const updateFilters = (next: ReturnType<typeof noVulnFilters>) => { setFilters(next); setPage(1); setSelected(new Set()); };
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [explain, setExplain] = useState<ExplainTarget | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const set = (patch: Partial<typeof filters>) => updateFilters({ ...filters, ...patch });

  const visible = useMemo(() => filterVulns(rows, filters), [rows, filters]);
  const groups = useMemo(() => groupVulns(visible, by === 'table' ? 'cve' : by, sort), [visible, by, sort]);
  // Tab counts ignore the status filter itself so each chip shows what it would give.
  const counts = useMemo(() => statusCounts(filterVulns(rows, { ...filters, status: 'all' })), [rows, filters]);
  const sorted = useMemo(() => [...visible].sort((a, b) => sort === 'sla' ? (a.slaHours ?? Infinity) - (b.slaHours ?? Infinity) || riskOf(b) - riskOf(a) : riskOf(b) - riskOf(a)), [visible, sort]);
  const totalPages = Math.max(1, Math.ceil((by === 'table' ? sorted.length : groups.length) / 25));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * 25, currentPage * 25);
  const pageGroups = groups.slice((currentPage - 1) * 25, currentPage * 25);
  const selectedRows = visible.filter((r) => selected.has(r.id));
  const explainRow = (r: VulnItem, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setExplain({ row: r, x: rect.right + 12, y: rect.top - 20 });
  };
  const filtered = isVulnFiltered(filters);
  const open = openKey ?? pageGroups[0]?.key ?? null;

  const changeStatus = (targets: VulnItem[], status: VulnStatus) => {
    if (setStatus.isPending || targets.length === 0) return;
    if (status === 'accepted' && !window.confirm(targets.length > 1 ? t('vulns.status.confirmAcceptMany', { n: targets.length }) : t('vulns.status.confirmAccept'))) return;
    setStatus.mutate({ ids: targets.map((r) => r.id), status }, {
      onSuccess: () => { setSelected(new Set()); setNotice({ tone: 'success', text: t('vulns.status.updated') }); },
      onError: (e) => setNotice({ tone: 'error', text: e instanceof ApiError && e.code === 'LOCAL_PREVIEW' ? t('asset.err.demo') : t('common.tryAgainLater') }),
    });
  };

  return (
    <div className={PAGE_CONTAINER}>
      <PageHeader title={t('vulns.title')} subtitle={t('vulns.subtitle')} actions={<>{demo ? <Tag tone="accent">{t('common.demoData')}</Tag> : null}<Button size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}>{t('vulns.refresh')}</Button></>} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Tile label={t('vulns.tile.kev')} sub={t('vulns.tile.kev.sub')} value={rows.filter((r) => r.kev).length} on={filters.kev} onClick={() => set({ kev: !filters.kev })} tone="text-critical-ink" />
        <Tile label={t('vulns.tile.open')} sub={t('vulns.tile.open.sub')} value={rows.filter((r) => r.status === 'open').length} on={filters.status === 'open'} onClick={() => set({ status: filters.status === 'open' ? 'all' : 'open' })} />
        <Tile label={t('vulns.tile.overdue')} sub={t('vulns.f.remediation')} value={rows.filter(isOverdue).length} on={filters.overdue} onClick={() => set({ overdue: !filters.overdue, sla: false })} tone="text-critical-ink" />
        <Tile label={t('vulns.f.exposed')} sub={t('vulns.f.asset')} value={rows.filter((r) => r.exposed).length} on={filters.exposed} onClick={() => set({ exposed: !filters.exposed })} />
      </div>
      {rows.length >= 2000 ? <Banner tone="info">{t('vulns.loadedLimit')}</Banner> : null}

      <div className="flex flex-col gap-2">
        <SearchInput
          size="md"
          shortcut={null}
          className="w-full shadow-card"
          placeholder={t('vulns.searchPlaceholder')}
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
        />
        <VulnFilterPanel filters={filters} onChange={updateFilters} counts={counts} />
      </div>

      {notice ? <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Banner> : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="grow text-[15px]">
          <span className="font-semibold">{t('vulns.results', { n: visible.length })}</span>
          {by !== 'table' ? <span className="ml-2 text-sm text-ink-subtle">{t('vulns.groups', { n: groups.length })}</span> : null}
        </div>
        {filtered ? <Button size="sm" variant="ghost" onClick={() => updateFilters(noVulnFilters())}>{t('vulns.clear')}</Button> : null}
        <Select size="sm" className="w-52" aria-label={t('vulns.sort.label')} value={sort} onChange={(v) => { setSort(v as VulnSort); setPage(1); setSelected(new Set()); }} options={(['risk', 'sla'] as const).map((v) => ({ value: v, label: t(`vulns.sort.${v}`) }))} />
        <div role="group" aria-label={t('vulns.view.label')} className="flex rounded-lg border border-line-strong bg-surface p-0.5 text-sm font-medium">
          {(['table', 'cve', 'host'] as const).map((g) => (
            <button key={g} type="button" aria-pressed={by === g} onClick={() => { setBy(g); setOpenKey(null); setPage(1); setSelected(new Set()); }} className={cx('h-8 rounded-md px-3 transition-colors', by === g ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:text-ink')}>
              {t(`vulns.view.${g}` as MessageKey)}
            </button>
          ))}
        </div>
      </div>

      {selectedRows.length > 0 && by === 'table' ? <div className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-2" role="region" aria-label={t('vulns.bulk')}>
        <span className="text-sm font-semibold">{t('vulns.selected', { n: selectedRows.length })}</span>
        <Select size="sm" className="w-60" value="" disabled={setStatus.isPending} aria-label={t('vulns.bulk')} placeholder={t('vulns.bulk')} options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}` as MessageKey) }))} onChange={(v) => changeStatus(selectedRows, v as VulnStatus)} />
        <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>{t('vulns.selectionClear')}</Button>
      </div> : null}
      {query.isError ? (
        <div className="rounded-xl border border-line bg-surface shadow-card"><LoadError onRetry={() => void query.refetch()} /></div>
      ) : query.isPending ? (
        <div className="rounded-xl border border-line bg-surface shadow-card"><LoadingRows /></div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface shadow-card">
          {filtered ? (
            <StateBlock kind="no-results" title={t('vulns.empty.title')} description={t('vulns.empty.desc')} action={<Button onClick={() => updateFilters(noVulnFilters())}>{t('vulns.clear')}</Button>} />
          ) : (
            <StateBlock kind="empty" title={t('vulns.none.title')} description={t('vulns.none.desc')} />
          )}
        </div>
      ) : by === 'table' ? (
        <FindingsTable rows={pageRows} selected={selected} canEdit={canEdit} pending={setStatus.isPending} onExplain={explainRow}
          onSelect={(id) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
          onSelectPage={() => setSelected((prev) => { const next = new Set(prev); const all = pageRows.every((r) => next.has(r.id)); pageRows.forEach((r) => { if (all) next.delete(r.id); else next.add(r.id); }); return next; })}
          renderStatus={(r) => <StatusSelect value={r.status} name={`${r.cve} / ${r.host}`} disabled={!canEdit || setStatus.isPending} onChange={(status) => changeStatus([r], status)} />}
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {pageGroups.map((g) => (
            <GroupCard
              key={`${g.by}:${g.key}`}
              g={g}
              canEdit={canEdit && !setStatus.isPending}
              open={open === g.key}
              onToggle={() => setOpenKey(open === g.key ? '' : g.key)}
              onSetAll={(s) => changeStatus(g.rows, s)}
              onStatus={(r, s) => changeStatus([r], s)}
              onExplain={(r, e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setExplain({ row: r, x: rect.right + 12, y: rect.top - 20 });
              }}
            />
          ))}
        </ul>
      )}
      {!query.isPending && !query.isError && visible.length > 0 ? <div className="flex items-center justify-between gap-3 text-sm text-ink-muted">
        <span>{t('vulns.page', { page: currentPage, total: totalPages })}</span>
        <div className="flex gap-2"><Button size="sm" disabled={currentPage === 1} onClick={() => { setPage(currentPage - 1); setSelected(new Set()); }}>{t('vulns.prev')}</Button><Button size="sm" disabled={currentPage === totalPages} onClick={() => { setPage(currentPage + 1); setSelected(new Set()); }}>{t('vulns.next')}</Button></div>
      </div> : null}
      {explain ? <ExplainPopover target={explain} onClose={() => setExplain(null)} /> : null}
    </div>
  );
}

export default function VulnsPage() {
  return (
    <RequirePermission any={[P.VULN_READ]}>
      <Vulns />
    </RequirePermission>
  );
}
