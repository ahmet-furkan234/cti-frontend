'use client';

import { useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Icon, type IconName } from './icon';
import { cx } from './controls';
import { useT } from '@/i18n';

/* ---------- Skeleton ---------- */
export function Skeleton({
  width = '100%',
  height = 12,
  circle,
  lines,
  className,
}: {
  width?: number | string;
  height?: number;
  circle?: boolean;
  lines?: number;
  className?: string;
}) {
  if (lines) {
    return (
      <span className="flex flex-col gap-2" aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <span key={i} className="skeleton block rounded-md" style={{ width: i === lines - 1 ? '60%' : '100%', height }} />
        ))}
      </span>
    );
  }
  return <span className={cx('skeleton block', circle ? 'rounded-full' : 'rounded-md', className)} aria-hidden="true" style={{ width, height }} />;
}

/* ---------- StateBlock: empty / error / forbidden / no-results ---------- */
const STATE_ICON: Record<string, IconName> = { empty: 'inbox', error: 'alert', forbidden: 'lock', 'no-results': 'search' };
const STATE_TONE: Record<string, string> = {
  empty: 'bg-surface-2 text-ink-muted',
  'no-results': 'bg-surface-2 text-ink-muted',
  error: 'bg-critical-soft text-critical-ink',
  forbidden: 'bg-high-soft text-high-ink',
};

export function StateBlock({
  kind = 'empty',
  title,
  description,
  code,
  action,
  compact,
}: {
  kind?: 'empty' | 'error' | 'forbidden' | 'no-results';
  title: string;
  description?: string;
  code?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cx('flex flex-col items-center gap-2 text-center', compact ? 'px-4 py-8' : 'px-4 py-14')} role={kind === 'error' ? 'alert' : undefined}>
      <span className={cx('mb-1 inline-flex items-center justify-center rounded-full', compact ? 'size-10' : 'size-12', STATE_TONE[kind])}>
        <Icon name={STATE_ICON[kind]!} size={compact ? 20 : 24} />
      </span>
      {code ? <div className="text-3xl font-semibold text-ink">{code}</div> : null}
      <div className="text-base font-semibold text-ink">{title}</div>
      {description ? <div className="max-w-sm text-[15px] text-ink-muted">{description}</div> : null}
      {action ? <div className="mt-2 flex gap-2">{action}</div> : null}
    </div>
  );
}

/* ---------- Banner ---------- */
const BANNER_ICON: Record<string, IconName> = { kev: 'flame', info: 'info', warning: 'alert', error: 'alert', success: 'check' };
const BANNER_TONE: Record<string, { box: string; icon: string }> = {
  kev: { box: 'bg-critical-soft border-critical/30', icon: 'text-critical-ink' },
  error: { box: 'bg-critical-soft border-critical/30', icon: 'text-critical-ink' },
  warning: { box: 'bg-high-soft border-high/30', icon: 'text-high-ink' },
  info: { box: 'bg-accent-soft border-transparent', icon: 'text-accent' },
  success: { box: 'bg-low-soft border-transparent', icon: 'text-low-ink' },
};

export function Banner({
  tone = 'info',
  title,
  children,
  action,
  onDismiss,
  className,
}: {
  tone?: 'kev' | 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={cx('flex items-start gap-3 rounded-xl border px-4 py-3', BANNER_TONE[tone]!.box, className)} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={BANNER_ICON[tone]!} size={18} className={cx('mt-0.5', BANNER_TONE[tone]!.icon)} />
      <div className="min-w-0 flex-1">
        {title ? <div className="font-semibold text-ink">{title}</div> : null}
        {children ? <div className="text-ink-muted">{children}</div> : null}
      </div>
      {action ? <div className="flex-none self-center">{action}</div> : null}
      {onDismiss ? (
        <button type="button" className="inline-flex rounded p-1 text-ink-muted hover:bg-black/5" onClick={onDismiss} aria-label={t('common.dismiss')}>
          <Icon name="x" size={16} />
        </button>
      ) : null}
    </div>
  );
}

/* ---------- Tabs ---------- */
export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
  disabled?: boolean;
}

export function Tabs({
  items,
  value,
  defaultValue,
  onChange,
  label,
  className,
}: {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  label?: string;
  className?: string;
}) {
  const [inner, setInner] = useState(defaultValue ?? items[0]?.id ?? '');
  const current = value ?? inner;
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const select = (id: string) => {
    if (value === undefined) setInner(id);
    onChange?.(id);
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const n = items.length;
    let j: number | null = null;
    if (e.key === 'ArrowRight') j = (i + 1) % n;
    else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = n - 1;
    if (j === null) return;
    e.preventDefault();
    const id = items[j]!.id;
    select(id);
    refs.current[id]?.focus();
  };
  return (
    <div className={cx('flex gap-6 overflow-x-auto border-b border-line [scrollbar-width:none]', className)} role="tablist" aria-label={label}>
      {items.map((it, i) => {
        const on = it.id === current;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className={cx(
              'relative inline-flex h-11 items-center gap-2 text-[15px] font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              on ? 'text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent' : 'text-ink-muted hover:text-ink',
            )}
            disabled={it.disabled}
            ref={(el) => {
              refs.current[it.id] = el;
            }}
            onClick={() => select(it.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {it.label}
            {it.count != null ? <span className="rounded-full bg-surface-2 px-2 text-xs font-medium text-ink-muted">{it.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- DataTable (dense) ---------- */
export interface Column<T> {
  key: string;
  header: ReactNode;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

export interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

const TH_CLASS = 'sticky top-0 z-1 h-10 border-b border-line bg-surface-2 px-3 text-sm font-medium whitespace-nowrap text-ink-muted';
const TD_CLASS = 'h-12 border-b border-line px-3 align-middle whitespace-nowrap text-ink group-last:border-b-0 group-hover:bg-surface-2 group-data-[selected]:bg-accent-soft';

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  skeletonRows = 5,
  empty,
  sort,
  onSort,
  selectable,
  selected = [],
  onSelect,
  onRowClick,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  skeletonRows?: number;
  empty?: ReactNode;
  sort?: SortState;
  onSort?: (s: SortState) => void;
  selectable?: boolean;
  selected?: string[];
  onSelect?: (keys: string[]) => void;
  onRowClick?: (row: T) => void;
  className?: string;
}) {
  const t = useT();
  const allOn = rows.length > 0 && rows.every((r, i) => selected.includes(rowKey(r, i)));
  const toggle = (k: string) => onSelect?.(selected.includes(k) ? selected.filter((x) => x !== k) : [...selected, k]);
  const toggleAll = () => onSelect?.(allOn ? [] : rows.map(rowKey));
  const colSpan = columns.length + (selectable ? 1 : 0);

  return (
    <div className={cx('overflow-auto rounded-xl border border-line bg-surface shadow-card', className)}>
      <table className="w-full border-separate border-spacing-0 text-[15px]">
        <thead>
          <tr>
            {selectable ? (
              <th className={TH_CLASS + ' w-10 pr-0'}>
                <input type="checkbox" className="m-0 size-4 cursor-pointer accent-accent" checked={allOn} onChange={toggleAll} aria-label={t('common.selectAll')} />
              </th>
            ) : null}
            {columns.map((c) => {
              const active = sort?.key === c.key;
              const style: CSSProperties = { width: c.width, textAlign: c.align ?? 'left' };
              return (
                <th key={c.key} className={TH_CLASS} style={style} aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sortable ? (
                    <button
                      type="button"
                      className={cx('inline-flex items-center gap-1 rounded font-medium hover:text-ink', active && 'text-ink')}
                      onClick={() => onSort?.({ key: c.key, dir: active && sort!.dir === 'desc' ? 'asc' : 'desc' })}
                    >
                      {c.header}
                      <Icon name={active ? (sort!.dir === 'asc' ? 'up' : 'down') : 'sort'} size={12} />
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }, (_, i) => (
              <tr key={i}>
                {selectable ? <td className={TD_CLASS + ' w-10 pr-0'} /> : null}
                {columns.map((c) => (
                  <td key={c.key} className={TD_CLASS}>
                    <Skeleton height={10} width={c.align === 'right' ? 40 : '70%'} />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan}>
                {empty ?? <StateBlock kind="empty" compact title={t('common.noData')} />}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => {
              const k = rowKey(r, i);
              const on = selected.includes(k);
              return (
                <tr key={k} className={cx('group', onRowClick && 'cursor-pointer')} data-selected={on || undefined} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                  {selectable ? (
                    <td className={cx(TD_CLASS, 'w-10 pr-0')} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="m-0 size-4 cursor-pointer accent-accent" checked={on} onChange={() => toggle(k)} aria-label={t('common.selectRow')} />
                    </td>
                  ) : null}
                  {columns.map((c) => (
                    <td key={c.key} className={TD_CLASS} style={{ textAlign: c.align ?? 'left' }}>
                      {c.render ? c.render(r) : ((r as Record<string, ReactNode>)[c.key] ?? null)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
