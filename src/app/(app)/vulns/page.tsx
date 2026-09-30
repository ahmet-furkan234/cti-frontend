'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/shell/page-guard';
import { Button, Checkbox, KevFlag, RiskRing, SearchInput, SeverityBadge, SlaChip, StatusPill, Tabs, Tag } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { initials } from '@/lib/format';
import { VULN_ROWS, VULN_TAB_COUNTS, riskFactors, riskOf, type VulnRow, type VulnStatus } from '@/mocks/vulns';

const COLS = { '--cols': '24px 52px 170px 190px 110px 150px 140px 110px minmax(0, 1fr)' } as React.CSSProperties;
const TAB_STATUS: Record<string, VulnStatus | null> = { all: null, open: 'open', ip: 'in_progress', acc: 'accepted', mit: 'mitigated' };
const FACTOR_COLOR = { cvss: 'var(--critical)', kev: 'var(--critical)', epss: 'var(--high)', exposed: 'var(--high)', crit: 'var(--medium)' } as const;

interface Explain {
  row: VulnRow;
  x: number;
  y: number;
}

function ExplainPopover({ explain, onClose }: { explain: Explain; onClose: () => void }) {
  const { t } = useI18n();
  const risk = riskOf(explain.row);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const label = (key: string, l: string) => (key === 'cvss' ? `CVSS ${l}` : key === 'epss' ? `EPSS ${l}` : t(`vulns.factor.${key}` as MessageKey));
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 19 }} onClick={onClose} role="presentation" />
      <div role="dialog" aria-label={t('vulns.why', { score: risk })} className="popover" style={{ position: 'fixed', left: Math.min(explain.x, window.innerWidth - 360), top: Math.min(explain.y, window.innerHeight - 340) }}>
        <div className="row" style={{ gap: 12 }}>
          <RiskRing score={risk} size={44} />
          <div className="col">
            <span className="h3">{t('vulns.why', { score: risk })}</span>
            <span className="mono-11 muted">{explain.row.cve} × {explain.row.host}</span>
          </div>
        </div>
        {riskFactors(explain.row).map((f) => (
          <div key={f.key} className="grid" style={{ gridTemplateColumns: '120px minmax(0, 1fr) 40px', gap: 10, alignItems: 'center' }}>
            <span className="sub">{label(f.key, f.label)}</span>
            <span className="bar-track"><span className="bar-fill" style={{ width: `${(f.points / f.max) * 100}%`, background: FACTOR_COLOR[f.key] }} /></span>
            <span className="mono-12 right">{f.points > 0 ? `+${f.points}` : '0'}</span>
          </div>
        ))}
        <div className="sub" style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>{t('vulns.why.note')}</div>
      </div>
    </>
  );
}

export default function VulnsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string[]>(VULN_ROWS.filter((r) => r.selected).map((r) => `${r.cve}|${r.host}`));
  const [explain, setExplain] = useState<Explain | null>(null);

  const rows = useMemo(() => {
    const st = TAB_STATUS[tab];
    const term = q.trim().toLowerCase();
    return VULN_ROWS.filter((r) => (!st || r.status === st) && (!term || `${r.cve} ${r.host} ${r.owner ?? ''}`.toLowerCase().includes(term))).sort((a, b) => riskOf(b) - riskOf(a));
  }, [tab, q]);
  const keyOf = (r: VulnRow) => `${r.cve}|${r.host}`;
  const toggle = (k: string) => setSelected((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  return (
    <div className="page" style={{ position: 'relative' }}>
      <PageHeader
        title={t('vulns.title')}
        subtitle={t('vulns.subtitle')}
        actions={
          <>
            <Tag tone="accent">{t('common.demoData')}</Tag>
            <SearchInput shortcut={null} style={{ width: 300 }} placeholder={t('vulns.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} />
            <Button icon="copy">{t('common.export')}</Button>
          </>
        }
      />
      <Tabs
        label={t('vulns.tabs.label')}
        value={tab}
        onChange={setTab}
        items={[
          { id: 'all', label: t('common.all'), count: VULN_TAB_COUNTS.all },
          { id: 'open', label: t('status.open'), count: VULN_TAB_COUNTS.open },
          { id: 'ip', label: t('status.in_progress'), count: VULN_TAB_COUNTS.ip },
          { id: 'acc', label: t('vulns.tab.accepted'), count: VULN_TAB_COUNTS.acc },
          { id: 'mit', label: t('status.mitigated'), count: VULN_TAB_COUNTS.mit },
        ]}
      />
      <section className="card card--clip col">
        {selected.length > 0 ? (
          <div className="row" style={{ gap: 12, height: 48, padding: '0 12px 0 16px', background: 'var(--accent-soft)', borderBottom: '1px solid var(--border)' }}>
            <Checkbox checked aria-label={t('vulns.clearSelection')} onChange={() => setSelected([])} />
            <span style={{ fontWeight: 500 }}>{t('vulns.selected', { n: selected.length })}</span>
            <span className="grow" />
            <Button size="sm">{t('vulns.bulk.status')}</Button>
            <Button size="sm">{t('vulns.bulk.assign')}</Button>
            <Button size="sm">{t('vulns.bulk.accept')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>{t('common.cancel')}</Button>
          </div>
        ) : null}
        <div className="scroll-x">
          <div className="trow trow--head" style={COLS}>
            <span /><span>{t('vulns.col.risk')} ↓</span><span>CVE</span><span>{t('vulns.col.asset')}</span><span>{t('vulns.col.severity')}</span>
            <span>{t('vulns.col.status')}</span><span>{t('vulns.col.assignee')}</span><span>SLA</span><span>{t('vulns.col.fix')}</span>
          </div>
          {rows.map((r) => {
            const k = keyOf(r);
            const on = selected.includes(k);
            const risk = riskOf(r);
            return (
              <div key={k} className={`trow${on ? ' trow--sel' : ''}`} style={{ ...COLS, height: 48 }}>
                <Checkbox checked={on} onChange={() => toggle(k)} aria-label={t('common.selectRow')} />
                <button
                  type="button"
                  aria-label={t('vulns.why', { score: risk })}
                  style={{ padding: 0, border: 0, background: 'transparent', cursor: 'pointer', borderRadius: 9999 }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setExplain({ row: r, x: rect.right + 12, y: rect.top - 20 });
                  }}
                >
                  <RiskRing score={risk} />
                </button>
                <span className="row gap-6">
                  <Link href={`/cves/${r.cve}`} className="mono-12" style={{ fontWeight: 500 }}>{r.cve}</Link>
                  {r.kev ? <KevFlag iconOnly /> : null}
                </span>
                <span className="col min0">
                  <span className="mono-12" style={{ lineHeight: '16px' }}>{r.host}</span>
                  <span className="muted" style={{ fontSize: 11, lineHeight: '14px' }}>{r.env}{r.exposed ? ` · ${t('vulns.exposed')}` : ` · ${t('vulns.internal')}`}</span>
                </span>
                <span><SeverityBadge score={r.cvss} /></span>
                <StatusPill status={r.status} />
                <span className="row gap-6" style={{ fontSize: 12, color: r.owner ? 'var(--ink)' : 'var(--ink-subtle)' }}>
                  <span className="avatar" style={{ width: 20, height: 20, fontSize: 10 }}>{r.owner ? initials(r.owner) : '?'}</span>
                  {r.owner ?? t('vulns.unassigned')}
                </span>
                <span>{r.slaHours != null ? <SlaChip hoursLeft={r.slaHours} /> : null}</span>
                <span className="ellipsis muted" style={{ fontSize: 12 }}>{r.fix}</span>
              </div>
            );
          })}
        </div>
      </section>
      {explain ? <ExplainPopover explain={explain} onClose={() => setExplain(null)} /> : null}
    </div>
  );
}
