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
      <span className="cti-skel-lines" aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <span key={i} className="cti-skel" style={{ width: i === lines - 1 ? '60%' : '100%', height }} />
        ))}
      </span>
    );
  }
  return <span className={cx('cti-skel', circle && 'cti-skel--circle', className)} aria-hidden="true" style={{ width, height }} />;
}

/* ---------- StateBlock: empty / error / forbidden / no-results ---------- */
const STATE_ICON: Record<string, IconName> = { empty: 'inbox', error: 'alert', forbidden: 'lock', 'no-results': 'search' };

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
    <div className={cx('cti-state', `cti-state--${kind}`, compact && 'cti-state--compact')} role={kind === 'error' ? 'alert' : undefined}>
      <span className="cti-state__icon">
        <Icon name={STATE_ICON[kind]!} size={compact ? 18 : 22} />
      </span>
      {code ? <div className="cti-state__code">{code}</div> : null}
      <div className="cti-state__title">{title}</div>
      {description ? <div className="cti-state__desc">{description}</div> : null}
      {action ? <div className="cti-state__action">{action}</div> : null}
    </div>
  );
}

/* ---------- Banner ---------- */
const BANNER_ICON: Record<string, IconName> = { kev: 'flame', info: 'info', warning: 'alert', error: 'alert', success: 'check' };

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
    <div className={cx('cti-banner', `cti-banner--${tone}`, className)} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={BANNER_ICON[tone]!} size={16} className="cti-banner__icon" />
      <div className="cti-banner__body">
        {title ? <div className="cti-banner__title">{title}</div> : null}
        {children ? <div className="cti-banner__text">{children}</div> : null}
      </div>
      {action ? <div className="cti-banner__action">{action}</div> : null}
      {onDismiss ? (
        <button type="button" className="cti-banner__x" onClick={onDismiss} aria-label={t('common.dismiss')}>
          <Icon name="x" size={14} />
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
    <div className={cx('cti-tabs', className)} role="tablist" aria-label={label}>
      {items.map((it, i) => {
        const on = it.id === current;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className={cx('cti-tab', on && 'is-active')}
            disabled={it.disabled}
            ref={(el) => {
              refs.current[it.id] = el;
            }}
            onClick={() => select(it.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {it.label}
            {it.count != null ? <span className="cti-tab__count">{it.count}</span> : null}
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
    <div className={cx('cti-table-wrap', className)}>
      <table className="cti-table">
        <thead>
          <tr>
            {selectable ? (
              <th className="cti-td--check">
                <input type="checkbox" className="cti-check" checked={allOn} onChange={toggleAll} aria-label={t('common.selectAll')} />
              </th>
            ) : null}
            {columns.map((c) => {
              const active = sort?.key === c.key;
              const style: CSSProperties = { width: c.width, textAlign: c.align ?? 'left' };
              return (
                <th key={c.key} style={style} aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sortable ? (
                    <button
                      type="button"
                      className={cx('cti-th__sort', active && 'is-active')}
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
                {selectable ? <td className="cti-td--check" /> : null}
                {columns.map((c) => (
                  <td key={c.key}>
                    <Skeleton height={10} width={c.align === 'right' ? 40 : '70%'} />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="cti-td--empty">
                {empty ?? <StateBlock kind="empty" compact title={t('common.noData')} />}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => {
              const k = rowKey(r, i);
              const on = selected.includes(k);
              return (
                <tr key={k} className={cx(on && 'is-selected', onRowClick && 'is-clickable')} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                  {selectable ? (
                    <td className="cti-td--check" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="cti-check" checked={on} onChange={() => toggle(k)} aria-label={t('common.selectRow')} />
                    </td>
                  ) : null}
                  {columns.map((c) => (
                    <td key={c.key} style={{ textAlign: c.align ?? 'left' }}>
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
