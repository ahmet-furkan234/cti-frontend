'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icon';
import { cx } from './controls';
import { useT } from '@/i18n';

export interface SelectOption {
  value: string;
  label: string;
  /** Small secondary line under the label. */
  hint?: string;
  /** Options with the same group label are listed together under a heading. */
  group?: string;
}

const MENU_MAX = 320;
const SEARCH_THRESHOLD = 8;

interface Pos {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

/** Custom listbox that replaces the native <select>; the menu is portalled so cards with overflow-hidden never clip it. */
export function Select({
  value,
  onChange,
  options,
  placeholder,
  'aria-label': ariaLabel,
  className,
  menuClassName,
  disabled,
  searchable,
  size = 'md',
  invalid,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  'aria-label'?: string;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
  /** Defaults to on when there are many options. */
  searchable?: boolean;
  size?: 'sm' | 'md';
  invalid?: boolean;
  id?: string;
}) {
  const t = useT();
  const uid = useId();
  const listId = `${uid}-list`;
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<Pos | null>(null);
  const typed = useRef({ text: '', at: 0 });

  const withSearch = searchable ?? options.length > SEARCH_THRESHOLD;
  const selected = options.find((o) => o.value === value);
  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? options.filter((o) => `${o.label} ${o.group ?? ''}`.toLowerCase().includes(term)) : options;
  }, [options, query]);

  const place = () => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 200 && above > below;
    const room = Math.max(120, Math.min(MENU_MAX, up ? above : below));
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 220) - 8)),
      width: r.width,
      maxHeight: room,
      ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
    });
  };

  const show = () => {
    if (disabled) return;
    setQuery('');
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    place();
    setOpen(true);
  };
  const hide = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };
  const choose = (o: SelectOption) => {
    onChange(o.value);
    hide();
  };

  // Keep the menu glued to the trigger and close on outside interaction.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as Node;
      if (!menu.current?.contains(el) && !trigger.current?.contains(el)) setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (menu.current?.contains(e.target as Node)) return;
      place();
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (open && withSearch) search.current?.focus();
  }, [open, withSearch]);

  // Scroll the highlighted option into view.
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, shown]);

  const move = (delta: number) => {
    if (shown.length === 0) return;
    setActive((i) => (i + delta + shown.length) % shown.length);
  };

  const onKey = (e: KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key) && e.target === trigger.current) {
        e.preventDefault();
        show();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); move(1); break;
      case 'ArrowUp': e.preventDefault(); move(-1); break;
      case 'Home': if (!withSearch) { e.preventDefault(); setActive(0); } break;
      case 'End': if (!withSearch) { e.preventDefault(); setActive(shown.length - 1); } break;
      case 'Enter': e.preventDefault(); if (shown[active]) choose(shown[active]!); break;
      case 'Escape': e.preventDefault(); e.stopPropagation(); hide(); break;
      case 'Tab': setOpen(false); break;
      default:
        // Type-ahead on lists without a search box.
        if (!withSearch && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
          const now = Date.now();
          typed.current = { text: (now - typed.current.at > 600 ? '' : typed.current.text) + e.key.toLowerCase(), at: now };
          const hit = shown.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
          if (hit >= 0) setActive(hit);
        }
    }
  };

  let lastGroup: string | undefined;
  return (
    <div className={cx('relative inline-block min-w-0', className)} onKeyDown={onKey}>
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? hide(false) : show())}
        className={cx(
          'flex w-full items-center gap-2 rounded-lg border bg-surface pr-2.5 pl-3 text-left text-ink transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          size === 'sm' ? 'h-9 text-sm' : 'h-10 text-[15px]',
          open ? 'border-accent outline-2 outline-accent/30' : invalid ? 'border-high' : 'border-line-control hover:border-line-strong',
        )}
      >
        <span className={cx('min-w-0 grow truncate', !selected && 'text-ink-subtle')}>{selected?.label ?? placeholder ?? ''}</span>
        <Icon name="down" size={16} className={cx('shrink-0 text-ink-subtle transition-transform', open && 'rotate-180')} />
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={menu}
              style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: Math.max(pos.width, 180), maxHeight: pos.maxHeight }}
              className={cx('z-50 flex flex-col overflow-hidden rounded-xl border border-line-strong bg-surface shadow-pop', menuClassName)}
              onKeyDown={onKey}
            >
              {withSearch ? (
                <div className="flex shrink-0 items-center gap-2 border-b border-line px-3">
                  <Icon name="search" size={15} className="text-ink-subtle" />
                  <input
                    ref={search}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                    placeholder={t('common.search')}
                    aria-label={t('common.search')}
                    aria-controls={listId}
                    aria-activedescendant={shown[active] ? `${uid}-o${active}` : undefined}
                    className="h-10 min-w-0 grow bg-transparent text-[15px] outline-none placeholder:text-ink-subtle"
                  />
                </div>
              ) : null}
              <div id={listId} role="listbox" aria-label={ariaLabel} className="grow overflow-y-auto p-1.5">
                {shown.length === 0 ? <div className="px-3 py-6 text-center text-sm text-ink-muted">{t('common.noData')}</div> : null}
                {shown.map((o, i) => {
                  const heading = o.group && o.group !== lastGroup ? o.group : null;
                  lastGroup = o.group;
                  const isSel = o.value === value;
                  return (
                    <div key={o.value} role="presentation">
                      {heading ? <div className="px-3 pt-2 pb-1 text-xs font-semibold text-ink-subtle">{heading}</div> : null}
                      <div
                        id={`${uid}-o${i}`}
                        role="option"
                        aria-selected={isSel}
                        data-index={i}
                        onMouseMove={() => setActive(i)}
                        onClick={() => choose(o)}
                        className={cx(
                          'flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-[15px]',
                          i === active && 'bg-surface-2',
                          isSel ? 'font-medium text-accent' : 'text-ink',
                        )}
                      >
                        <span className="flex min-w-0 grow flex-col">
                          <span className="truncate">{o.label}</span>
                          {o.hint ? <span className="truncate text-sm font-normal text-ink-muted">{o.hint}</span> : null}
                        </span>
                        {isSel ? <Icon name="check" size={16} className="shrink-0" /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
