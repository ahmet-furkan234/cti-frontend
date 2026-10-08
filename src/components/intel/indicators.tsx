'use client';

import { useMemo, useState } from 'react';
import { Drawer } from '@/components/admin/admin-parts';
import { IocAssets } from '@/components/intel/ioc-assets';
import { Banner, Button, Icon, MonoText, SearchInput, StateBlock, Switch, cx } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { IOC_GROUP, IOC_ICON, IOC_TYPES, confidenceOf, daysLeft, detectIocType, type IocGroup } from '@/lib/intel';
import type { Ioc, IocType } from '@/mocks/intel';

const GROUPS: ('all' | IocGroup)[] = ['all', 'address', 'domain', 'file', 'other'];
const CONF_STYLE = { high: { bar: 'var(--critical)', text: 'text-critical-ink' }, medium: { bar: 'var(--high)', text: 'text-high-ink' }, low: { bar: 'var(--medium)', text: 'text-medium-ink' } } as const;

function Expiry({ expires }: { expires: string | null }) {
  const { t } = useI18n();
  const left = daysLeft(expires);
  if (left == null) return <span className="text-ink-muted">{t('intel.ioc.exp.never')}</span>;
  if (left < 0) return <span className="text-ink-subtle">{t('intel.ioc.exp.expired')}</span>;
  if (left === 0) return <span className="font-medium text-high-ink">{t('intel.ioc.exp.today')}</span>;
  return <span className={left <= 7 ? 'font-medium text-high-ink' : 'text-ink-muted'}>{t('intel.ioc.exp.days', { n: left })}</span>;
}

function Row({ ioc, open, onToggle, onDelete }: { ioc: Ioc; open: boolean; onToggle: () => void; onDelete?: (() => void) | undefined }) {
  const { t } = useI18n();
  const level = confidenceOf(ioc.confidence);
  const expired = (daysLeft(ioc.expires) ?? 0) < 0;
  return (
    <li id={`ioc-${ioc.id}`} className={cx('border-b border-line last:border-b-0', open && 'bg-surface-2/60')}>
      <button type="button" aria-expanded={open} onClick={onToggle} className="grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-4 text-left hover:bg-surface-2 md:grid-cols-[40px_minmax(0,1.6fr)_150px_170px_20px]">
        <span className={cx('inline-flex size-10 items-center justify-center rounded-lg bg-surface-2 text-ink-muted', expired && 'opacity-50')}><Icon name={IOC_ICON[ioc.type]} size={18} /></span>
        <span className="flex min-w-0 flex-col">
          <span className={cx('truncate font-mono text-[14px]', expired && 'text-ink-muted line-through')}>{ioc.value}</span>
          <span className="text-sm text-ink-muted">{t(`intel.type.${ioc.type}` as MessageKey)} · {ioc.source}</span>
        </span>
        <span className="hidden flex-col gap-1 md:flex">
          <span className={cx('text-sm font-medium', CONF_STYLE[level].text)}>{t(`intel.ioc.conf.${level}` as MessageKey)}</span>
          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-3"><span className="block h-full rounded-full" style={{ width: `${ioc.confidence}%`, background: CONF_STYLE[level].bar }} /></span>
        </span>
        <span className="flex flex-col items-end gap-0.5 text-sm md:items-start">
          {ioc.matches > 0 ? <span className="font-semibold text-critical-ink">{t('intel.ioc.matches', { n: ioc.matches })}</span> : <span className="text-ink-subtle">{t('intel.ioc.noMatch')}</span>}
          <Expiry expires={ioc.expires} />
        </span>
        <Icon name="down" size={16} className={cx('hidden text-ink-subtle transition-transform md:block', open && 'rotate-180')} />
      </button>
      {open ? (
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 px-5 pb-5 pl-[76px] text-[15px]">
          <dt className="text-ink-muted">{t('intel.ioc.value')}</dt><dd className="m-0 min-w-0"><MonoText copy>{ioc.value}</MonoText></dd>
          <dt className="text-ink-muted">{t('intel.ioc.source')}</dt><dd className="m-0">{ioc.source}</dd>
          <dt className="text-ink-muted">{t('intel.ioc.confidence')}</dt><dd className="m-0 tabular-nums">{ioc.confidence} / 100</dd>
          <dt className="text-ink-muted">{t('intel.ioc.expires')}</dt><dd className="m-0">{ioc.expires ?? t('intel.ioc.exp.never')}</dd>
          {onDelete ? <dd className="col-span-2 m-0 pt-2"><Button size="sm" variant="danger" icon="trash" onClick={onDelete}>{t('intel.ioc.delete')}</Button></dd> : null}
          {ioc.matches > 0 ? (
            <dd className="col-span-2 m-0 pt-2">
              <div className="mb-1 text-sm font-medium text-ink-muted">{t('intel.ioc.viewAssets')}</div>
              <IocAssets id={ioc.id} />
            </dd>
          ) : null}
        </dl>
      ) : null}
    </li>
  );
}

export function IndicatorList({ iocs, total, focusId, onAdd, onDelete }: { iocs: Ioc[]; total: number; focusId: string | null; onAdd: () => void; onDelete?: ((ioc: Ioc) => void) | undefined }) {
  const { t, locale } = useI18n();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<'all' | IocGroup>('all');
  const [onlyMatches, setOnlyMatches] = useState(false);
  const [open, setOpen] = useState<string | null>(focusId);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return iocs.filter(
      (i) => (group === 'all' || IOC_GROUP[i.type] === group) && (!onlyMatches || i.matches > 0) && (!term || `${i.value} ${i.source} ${i.type}`.toLowerCase().includes(term)),
    );
  }, [iocs, q, group, onlyMatches]);
  const filtered = !!(q.trim() || group !== 'all' || onlyMatches);

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[15px] text-ink-muted">{t('intel.ioc.hint')}</p>
      <div className="flex flex-col gap-3">
        <SearchInput shortcut={null} className="w-full md:max-w-md" placeholder={t('intel.ioc.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('intel.tab.indicators')}>
          {GROUPS.map((g) => (
            <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)} className={cx('h-9 rounded-full border px-3.5 text-sm font-medium transition-colors', group === g ? 'border-transparent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink-muted hover:text-ink')}>
              {t(`intel.ioc.g.${g}` as MessageKey)}
            </button>
          ))}
          <span className="grow" />
          <Switch checked={onlyMatches} onChange={setOnlyMatches} label={t('intel.ioc.onlyMatches')} />
        </div>
      </div>
      <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {rows.length === 0 ? (
          <StateBlock kind="no-results" compact title={t('intel.ioc.empty')} description={t('intel.ioc.emptyHint')} action={filtered ? <Button size="sm" onClick={() => { setQ(''); setGroup('all'); setOnlyMatches(false); }}>{t('intel.ioc.clear')}</Button> : <Button size="sm" icon="plus" onClick={onAdd}>{t('intel.ioc.add')}</Button>} />
        ) : (
          <ul className="m-0 list-none p-0">{rows.map((i) => <Row key={i.id} ioc={i} open={open === i.id} onToggle={() => setOpen((o) => (o === i.id ? null : i.id))} onDelete={onDelete ? () => onDelete(i) : undefined} />)}</ul>
        )}
      </section>
      <p className="m-0 text-sm text-ink-subtle">{t('intel.ioc.count', { n: rows.length.toLocaleString(locale) })}{total > iocs.length ? ` · ${t('intel.ioc.capped', { total: total.toLocaleString(locale) })}` : ''}</p>
    </div>
  );
}

export function AddIndicatorsDrawer({ saving, onAdd, onClose }: { saving?: boolean; onAdd: (items: { value: string; type: IocType }[]) => void; onClose: () => void }) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const parsed = useMemo(() => {
    const seen = new Set<string>();
    const ok: { value: string; type: IocType }[] = [];
    let unknown = 0;
    for (const line of text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
      const type = detectIocType(line);
      if (!type) unknown++;
      else if (!seen.has(line.toLowerCase())) { seen.add(line.toLowerCase()); ok.push({ value: line, type }); }
    }
    return { ok, unknown };
  }, [text]);
  const byType = IOC_TYPES.map((ty) => [ty, parsed.ok.filter((x) => x.type === ty).length] as const).filter(([, n]) => n > 0);

  return (
    <Drawer title={t('intel.imp.title')} onClose={onClose}
      footer={
        <>
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" icon="plus" loading={saving} disabled={parsed.ok.length === 0} onClick={() => onAdd(parsed.ok)}>{t('intel.imp.submit', { n: parsed.ok.length })}</Button>
        </>
      }
    >
      <p className="text-[15px] text-ink-muted">{t('intel.imp.desc')}</p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ioc-text" className="text-sm font-medium">{t('intel.imp.label')}</label>
        <textarea id="ioc-text" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('intel.imp.placeholder')} spellCheck={false} className="w-full resize-y rounded-lg border border-line-control bg-surface p-3 font-mono text-sm text-ink placeholder:text-ink-subtle focus-visible:border-accent" autoFocus />
      </div>
      {parsed.ok.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-4">
          <span className="text-sm font-medium">{t('intel.imp.found', { n: parsed.ok.length })}</span>
          <div className="flex flex-wrap gap-1.5">
            {byType.map(([ty, n]) => <span key={ty} className="inline-flex h-7 items-center rounded-md bg-surface px-2.5 text-sm">{t(`intel.type.${ty}` as MessageKey)} · {n}</span>)}
          </div>
        </div>
      ) : null}
      {parsed.unknown > 0 ? <Banner tone="warning">{t('intel.imp.unknown', { n: parsed.unknown })}</Banner> : null}
    </Drawer>
  );
}
