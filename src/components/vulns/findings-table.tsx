'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';
import { KevFlag, RiskRing, SeverityBadge, SlaChip } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import type { VulnItem } from '@/features/vulns/map';
import { riskOf } from '@/mocks/vulns';

export function FindingsTable({ rows, selected, onSelect, onSelectPage, onExplain, renderStatus, canEdit, pending }: {
  rows: VulnItem[]; selected: Set<string>; onSelect: (id: string) => void; onSelectPage: () => void;
  onExplain: (row: VulnItem, event: MouseEvent<HTMLButtonElement>) => void;
  renderStatus: (row: VulnItem) => ReactNode; canEdit: boolean; pending: boolean;
}) {
  const { t } = useI18n();
  const all = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const some = rows.some((row) => selected.has(row.id));
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-card">
      <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
        <caption className="sr-only">{t('vulns.title')}</caption>
        <thead className="border-b border-line bg-surface-2 text-xs text-ink-muted">
          <tr>
            {canEdit ? <th className="w-10 px-3 py-3"><input type="checkbox" disabled={pending} className="size-4 accent-accent" aria-label={t('vulns.selectPage')} checked={all} ref={(node) => { if (node) node.indeterminate = some && !all; }} onChange={onSelectPage} /></th> : null}
            {['vulns.col.risk', 'vulns.col.cve', 'vulns.col.asset', 'vulns.f.cvss', 'vulns.col.fix', 'vulns.f.remediation', 'vulns.col.status'].map((key) => <th scope="col" key={key} className="px-3 py-3 font-medium whitespace-nowrap">{t(key as MessageKey)}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id} className={selected.has(r.id) ? 'bg-accent-soft/50' : 'hover:bg-surface-2/60'}>
              {canEdit ? <td className="px-3 py-3"><input type="checkbox" disabled={pending} className="size-4 accent-accent" aria-label={t('vulns.select', { name: `${r.cve} / ${r.host} / ${r.component}` })} checked={selected.has(r.id)} onChange={() => onSelect(r.id)} /></td> : null}
              <td className="px-3 py-3"><button type="button" onClick={(e) => onExplain(r, e)} aria-label={t('vulns.why', { score: riskOf(r) })} className="rounded-full"><RiskRing score={riskOf(r)} size={36} /></button></td>
              <td className="px-3 py-3"><Link href={`/cves/${r.cve}`} className="whitespace-nowrap font-mono font-semibold hover:underline">{r.cve}</Link><div className="mt-1 h-6">{r.kev ? <KevFlag /> : <span className="text-xs text-ink-subtle">—</span>}</div></td>
              <td className="max-w-52 px-3 py-3"><Link href={`/assets/${r.assetId}`} title={r.host} className="block truncate font-medium hover:underline">{r.host}</Link><div className="mt-1 flex items-center gap-2 text-xs text-ink-muted"><span>{t(`env.${r.env}` as MessageKey)}</span>{r.exposed ? <span className="text-critical-ink">{t('vulns.exposed')}</span> : <span>{t('vulns.internal')}</span>}</div></td>
              <td className="px-3 py-3"><SeverityBadge score={r.cvss} /><div className="mt-1 text-xs text-ink-muted tabular-nums">EPSS {(r.epss * 100).toFixed(1)}%</div></td>
              <td className="max-w-56 px-3 py-3"><span title={r.component} className="block truncate font-mono text-xs">{r.component}</span><span className="mt-1 block truncate text-xs text-ink-muted" title={`${r.installedVersion ?? '—'} → ${r.fix}`}>{r.installedVersion ?? '—'} → {r.fix}</span></td>
              <td className="px-3 py-3">{r.slaHours != null ? <SlaChip hoursLeft={r.slaHours} /> : <span className="text-ink-subtle">—</span>}</td>
              <td className="px-3 py-3">{renderStatus(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
