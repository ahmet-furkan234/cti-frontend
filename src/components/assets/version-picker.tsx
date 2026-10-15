'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Icon, INPUT_CLASS, Tag, cx } from '@/components/ui';
import { useProductVersions } from '@/features/assets/hooks';
import { useI18n } from '@/i18n';

/**
 * Version field: a text box (any version can be typed) whose dropdown lists the known versions of the chosen
 * product, newest first, narrowing as you type.
 */
export function VersionPicker({ product, value, onChange, className }: { product: string; value: string; onChange: (v: string) => void; className?: string }) {
  const { t } = useI18n();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [place, setPlace] = useState({ up: false, room: 240 });
  const all = useProductVersions(product.trim()).data?.items ?? [];
  const typed = value.trim();
  // Typing narrows by prefix; an exact pick (or empty box) shows everything.
  const shown = typed && !all.includes(typed) ? all.filter((v) => v.startsWith(typed)) : all;
  const usable = all.length > 0;

  useEffect(() => setActive(-1), [typed, open]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);
  // Opens downward; flips up only when the list would not fit below and there is more room above. The side is
  // chosen once per opening (so it does not jump while typing or scrolling); the height follows the available room.
  const up = useRef(false);
  const rows = useRef(0);
  rows.current = shown.length;
  useEffect(() => {
    if (!open) return;
    let first = true;
    const fit = () => {
      const r = root.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom - 16;
      const above = r.top - 16;
      if (first) {
        const need = Math.min(340, 48 + Math.max(rows.current, 1) * 34);
        up.current = below < need && above > below;
        first = false;
      }
      setPlace({ up: up.current, room: Math.max(120, Math.min(up.current ? above : below, 340)) });
    };
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('scroll', fit, true);
    return () => { window.removeEventListener('resize', fit); window.removeEventListener('scroll', fit, true); };
  }, [open]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const pick = (v: string) => { onChange(v); setOpen(false); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!usable) return;
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      if (shown.length > 0) setActive((a) => (e.key === 'ArrowDown' ? (a + 1) % shown.length : (a - 1 + shown.length) % shown.length));
    } else if (e.key === 'Enter' && open && active >= 0 && shown[active]) {
      e.preventDefault();
      pick(shown[active]!);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={root} className={cx('relative min-w-0', className)}>
      <input
        role="combobox"
        aria-label={t('asset.sw.version')}
        aria-expanded={open && usable}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-o${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={t('asset.sw.version.hint')}
        value={value}
        onChange={(e) => { onChange(e.target.value); if (usable) setOpen(true); }}
        onFocus={() => usable && setOpen(true)}
        onClick={() => usable && setOpen(true)}
        onKeyDown={onKey}
        className={cx(INPUT_CLASS, 'font-mono text-sm', usable && 'pr-9', open && usable && 'border-accent')}
      />
      {usable ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label={t('asset.sw.version.pick')}
          onClick={() => setOpen((o) => !o)}
          className="absolute inset-y-0 right-0 inline-flex w-9 items-center justify-center text-ink-subtle hover:text-ink"
        >
          <Icon name="down" size={16} className={cx('transition-transform', open && 'rotate-180')} />
        </button>
      ) : null}

      {open && usable ? (
        <div className={cx('absolute right-0 z-50 flex w-56 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl', place.up ? 'bottom-full mb-1.5' : 'top-full mt-1.5')} style={{ maxHeight: place.room }}>
          <div className="shrink-0 border-b border-line px-3 py-2 text-xs font-semibold tracking-wide text-ink-subtle uppercase">{t('asset.sw.version.pick')}</div>
          <ul ref={list} id={`${id}-list`} role="listbox" aria-label={t('asset.sw.version')} className="m-0 min-h-0 grow list-none overflow-y-auto p-1.5">
            {shown.length === 0 ? <li className="px-3 py-4 text-center text-sm text-ink-muted">{t('asset.sw.version.none')}</li> : null}
            {shown.map((v, i) => {
              const chosen = v === typed;
              return (
                <li key={v} id={`${id}-o${i}`} role="option" aria-selected={chosen} data-i={i}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(v)}
                    className={cx('flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left', i === active ? 'bg-accent-soft' : 'hover:bg-surface-2')}
                  >
                    <span className={cx('grow font-mono text-sm', chosen ? 'font-semibold text-accent' : 'text-ink')}>{v}</span>
                    {v === all[0] ? <Tag tone="accent">{t('asset.sw.version.latest')}</Tag> : null}
                    {chosen ? <Icon name="check" size={15} className="shrink-0 text-accent" strokeWidth={2.5} /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
