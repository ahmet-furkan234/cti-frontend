'use client';

import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { Icon, INPUT_CLASS, Tag, cx } from '@/components/ui';
import { useProductSearch } from '@/features/assets/hooks';
import { useI18n, type MessageKey } from '@/i18n';
import { useDebounced } from '@/lib/use-debounced';
import type { ProductSuggestionDto } from '@/lib/types';

/** "windows_server_2019" → "windows server 2019": the CVE data names products with underscores, people do not. */
export const productLabel = (product: string) => product.replace(/_+/g, ' ');

/**
 * Software name picker: a field that opens a panel with its own search box and a scrollable list of the products the
 * CVE data knows (plus the team's own names). A name that is not in the list can still be used as typed.
 */
export function SoftwareCombobox({ value, onChange, onPick, label, placeholder, className }: {
  value: string;
  onChange: (v: string) => void;
  onPick?: (s: ProductSuggestionDto) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const id = useId();
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const q = useDebounced(query.trim(), 200);
  const results = useProductSearch(open ? q : '', open);
  const items = results.data?.items ?? [];
  const typed = query.trim();
  const custom = typed && !items.some((i) => i.product.toLowerCase() === typed.toLowerCase()) ? typed : null;
  const count = items.length + (custom ? 1 : 0);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    if (open) search.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const close = () => { setOpen(false); setQuery(''); };
  const pickItem = (s: ProductSuggestionDto) => { onChange(s.product); onPick?.(s); close(); };
  const pickCustom = () => { if (custom) { onChange(custom); close(); } };
  const pickAt = (i: number) => (i < items.length ? pickItem(items[i]!) : pickCustom());

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (count > 0) setActive((a) => (e.key === 'ArrowDown' ? (a + 1) % count : (a - 1 + count) % count));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (count > 0) pickAt(Math.min(active, count - 1));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  return (
    <div className={cx('min-w-0', className)}>
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); setOpen(true); } }}
        className={cx(INPUT_CLASS, 'flex items-center justify-between gap-2 text-left', open && 'border-accent')}
      >
        <span className={cx('truncate', !value && 'text-ink-subtle')}>{value ? productLabel(value) : (placeholder ?? '')}</span>
        <Icon name="down" size={16} className={cx('shrink-0 text-ink-subtle transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 pt-[10vh] backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div role="dialog" aria-modal="true" aria-label={label} className="flex max-h-[76vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Icon name="search" size={18} className="shrink-0 text-ink-subtle" />
              <input
                ref={search}
                role="searchbox"
                aria-label={t('asset.sw.search')}
                aria-controls={`${id}-list`}
                aria-activedescendant={count > 0 ? `${id}-o${Math.min(active, count - 1)}` : undefined}
                autoComplete="off"
                spellCheck={false}
                placeholder={t('asset.sw.search')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKey}
                className="h-14 min-w-0 grow border-0 bg-transparent text-base text-ink outline-none placeholder:text-ink-subtle"
              />
              <button type="button" aria-label={t('common.close')} onClick={close} className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-subtle hover:bg-surface-2 hover:text-ink">
                <Icon name="x" size={16} />
              </button>
            </div>
          <ul id={`${id}-list`} role="listbox" aria-label={label} className="m-0 min-h-0 grow list-none overflow-y-auto p-2">
            {count === 0 ? <li className="px-3 py-6 text-center text-sm text-ink-muted">{results.isPending ? t('common.loading') : t('asset.sw.none')}</li> : null}
            {items.map((s, i) => {
              const chosen = s.product === value;
              const heading = s.alias ? (items[i - 1]?.alias ? null : 'own') : s.group && s.group !== items[i - 1]?.group ? s.group : null;
              return (
                <Fragment key={`${s.product}-${s.alias ? 'a' : 'p'}`}>
                {heading ? <li role="presentation" className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-subtle uppercase">{t(`asset.sw.group.${heading}` as MessageKey)}</li> : null}
                <li id={`${id}-o${i}`} role="option" aria-selected={chosen}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pickItem(s)}
                    className={cx('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left', i === active ? 'bg-accent-soft' : 'hover:bg-surface-2')}
                  >
                    <span className="flex min-w-0 grow flex-col">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-medium text-ink">{productLabel(s.product)}</span>
                        {s.alias ? <Tag tone="accent">{t('asset.sw.alias')}</Tag> : null}
                      </span>
                      <span className="truncate text-sm text-ink-muted">{s.vendors.slice(0, 3).map(productLabel).join(', ')}{s.vendors.length > 3 ? ` +${s.vendors.length - 3}` : ''} · {t('asset.sw.cves', { n: s.cves.toLocaleString(locale) })}</span>
                    </span>
                    {chosen ? <Icon name="check" size={16} className="shrink-0 text-accent" strokeWidth={2.5} /> : null}
                  </button>
                </li>
                </Fragment>
              );
            })}
            {custom ? (
              <li id={`${id}-o${items.length}`} role="option" aria-selected={false}>
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseEnter={() => setActive(items.length)}
                  onClick={pickCustom}
                  className={cx('mt-1 flex w-full items-center gap-2 rounded-lg border-t border-line px-3 py-2.5 text-left text-[15px]', active === items.length ? 'bg-accent-soft' : 'hover:bg-surface-2')}
                >
                  <Icon name="plus" size={15} className="shrink-0 text-accent" />
                  <span className="truncate">{t('asset.sw.useTyped', { name: custom })}</span>
                </button>
              </li>
            ) : null}
          </ul>
            <div className="flex items-center gap-4 border-t border-line bg-surface-2 px-4 py-2.5 text-xs text-ink-muted">
              <span>{t('asset.sw.keys.move')}</span>
              <span>{t('asset.sw.keys.pick')}</span>
              <span>{t('asset.sw.keys.close')}</span>
              <span className="grow" />
              {items.length > 0 ? <span className="tabular-nums">{t('asset.sw.shown', { n: items.length.toLocaleString(locale) })}</span> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
