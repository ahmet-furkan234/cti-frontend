'use client';

import { useState } from 'react';
import { Drawer } from '@/components/admin/admin-parts';
import { Button, Icon, INPUT_CLASS, SearchInput, Select, Tag, TextField, cx } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { type ActivityFilter } from '@/lib/activity';
import { AUDIT_ACTIONS } from '@/lib/audit-actions';
import { RANGES, actionLabel, type RangeKey } from '@/lib/audit';

const CATEGORIES: ActivityFilter[] = ['all', 'account', 'access', 'security'];

function Option({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className={cx('h-9 min-w-0 rounded-lg px-3 text-sm font-medium transition-colors', on ? 'bg-accent text-on-accent shadow-sm' : 'text-ink-muted hover:bg-surface hover:text-ink')}>{children}</button>;
}

export function AuditFilterPanel({ category, range, custom, action, onCategoryChange, onRangeChange, onCustomChange, onActionChange, onClear }: {
  category: ActivityFilter;
  range: RangeKey;
  custom: { from: string; to: string };
  action: string;
  onCategoryChange: (value: ActivityFilter) => void;
  onRangeChange: (value: RangeKey) => void;
  onCustomChange: (value: { from: string; to: string }) => void;
  onActionChange: (value: string) => void;
  onClear: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [actionModal, setActionModal] = useState(false);
  const [actionQuery, setActionQuery] = useState('');
  const actionTerm = actionQuery.trim().toLocaleLowerCase();
  const visibleActions = actionTerm ? AUDIT_ACTIONS.filter((value) => `${actionLabel(t, value)} ${value}`.toLocaleLowerCase().includes(actionTerm)) : AUDIT_ACTIONS;
  const closeActionModal = () => { setActionModal(false); setActionQuery(''); };
  const chooseAction = (value: string) => { onActionChange(value); closeActionModal(); };
  const count = (category !== 'all' ? 1 : 0) + (range !== 'all' ? 1 : 0) + (action ? 1 : 0);
  const tags: { key: string; label: string; remove: () => void }[] = [];
  if (category !== 'all') tags.push({ key: 'category', label: t(`auditlog.cat.${category}` as MessageKey), remove: () => onCategoryChange('all') });
  if (range !== 'all') tags.push({ key: 'range', label: range === 'custom' ? `${custom.from || '…'} – ${custom.to || '…'}` : t(`auditlog.range.${range}` as MessageKey), remove: () => { onRangeChange('all'); onCustomChange({ from: '', to: '' }); } });
  if (action) tags.push({ key: 'action', label: actionLabel(t, action), remove: () => onActionChange('') });

  return (
    <section className="min-w-0 rounded-xl border border-line bg-surface shadow-card" aria-label={t('auditlog.filters')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <Button size="sm" icon="filter" variant={open ? 'secondary' : 'ghost'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {t('auditlog.filters')}{count ? <span className="ml-1 rounded-full bg-accent px-2 text-xs tabular-nums text-on-accent">{count}</span> : null}
        </Button>
        {!open ? tags.length ? <div className="flex min-w-0 flex-wrap gap-1.5">{tags.map((tag) => <Tag key={tag.key} tone="accent" onRemove={tag.remove}>{tag.label}</Tag>)}</div> : <span className="text-sm text-ink-subtle">{t('auditlog.filters.none')}</span> : null}
        <span className="grow" />
        {count ? <Button size="sm" variant="ghost" onClick={onClear}>{t('common.clearFilters')}</Button> : null}
        <Button size="sm" variant="ghost" aria-label={t(open ? 'common.close' : 'auditlog.filters')} onClick={() => setOpen((value) => !value)}><Icon name={open ? 'up' : 'down'} size={16} /></Button>
      </div>

      {open ? <div className="grid grid-cols-1 gap-x-6 gap-y-5 border-t border-line px-5 py-4 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2 md:col-span-2">
          <h3 className="text-balance text-[15px] font-semibold">{t('auditlog.filters.category')}</h3>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 md:grid-cols-4" role="group" aria-label={t('auditlog.filters.category')}>
            {CATEGORIES.map((value) => <Option key={value} on={category === value} onClick={() => onCategoryChange(value)}>{t(`auditlog.cat.${value}` as MessageKey)}</Option>)}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <label className="text-sm font-semibold" htmlFor="audit-range">{t('auditlog.f.range')}</label>
          <Select id="audit-range" aria-label={t('auditlog.f.range')} value={range} onChange={(value) => onRangeChange(value as RangeKey)} options={RANGES.map((value) => ({ value, label: t(`auditlog.range.${value}` as MessageKey) }))} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-sm font-semibold">{t('auditlog.f.action')}</span>
          <button type="button" role="combobox" aria-haspopup="dialog" aria-expanded={actionModal} onClick={() => setActionModal(true)} className={cx(INPUT_CLASS, 'flex items-center justify-between gap-3 text-left')}>
            <span className="min-w-0 truncate">{action ? actionLabel(t, action) : t('auditlog.f.allActions')}</span>
            <Icon name="search" size={16} className="shrink-0 text-ink-subtle" />
          </button>
        </div>
        {range === 'custom' ? <div className="grid grid-cols-2 gap-3 md:col-span-2"><TextField label={t('auditlog.from')} type="date" value={custom.from} max={custom.to || undefined} onChange={(e) => onCustomChange({ ...custom, from: e.target.value })} /><TextField label={t('auditlog.to')} type="date" value={custom.to} min={custom.from || undefined} onChange={(e) => onCustomChange({ ...custom, to: e.target.value })} /></div> : null}
      </div> : null}

      {actionModal ? (
        <Drawer centered medium hideScrollbar title={t('auditlog.actionModal.title')} onClose={closeActionModal}>
          <SearchInput autoFocus shortcut={null} className="w-full" placeholder={t('auditlog.actionModal.search')} value={actionQuery} onChange={(e) => setActionQuery(e.target.value)} />
          <div className="min-h-0 overflow-y-auto rounded-xl border border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="listbox" aria-label={t('auditlog.actionModal.title')}>
            {!actionTerm ? (
              <button type="button" role="option" aria-selected={!action} onClick={() => chooseAction('')} className={cx('flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left hover:bg-surface-2', !action && 'bg-accent-soft')}>
                <span className="grow text-sm font-medium">{t('auditlog.f.allActions')}</span>
                {!action ? <Icon name="check" size={16} className="text-accent" /> : null}
              </button>
            ) : null}
            {visibleActions.map((value) => (
              <button key={value} type="button" role="option" aria-selected={action === value} onClick={() => chooseAction(value)} className={cx('flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-surface-2', action === value && 'bg-accent-soft')}>
                <span className="flex min-w-0 grow flex-col gap-0.5">
                  <span className="truncate text-sm font-medium text-ink">{actionLabel(t, value)}</span>
                  <span className="truncate font-mono text-xs text-ink-subtle">{value}</span>
                </span>
                {action === value ? <Icon name="check" size={16} className="shrink-0 text-accent" /> : null}
              </button>
            ))}
            {visibleActions.length === 0 ? <div className="px-4 py-10 text-center text-sm text-ink-muted">{t('auditlog.actionModal.empty')}</div> : null}
          </div>
        </Drawer>
      ) : null}
    </section>
  );
}
