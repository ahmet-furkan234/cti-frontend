'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { Icon, cx } from '@/components/ui';
import { useT } from '@/i18n';

/** Type a value and press Enter (or comma) to turn it into a removable chip. */
export function TagInput({
  label, hint, placeholder, value, onChange,
}: {
  label: string;
  hint?: string;
  placeholder?: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useT();
  const id = useId();
  const [text, setText] = useState('');

  const commit = () => {
    const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length) onChange([...value, ...parts.filter((p) => !value.some((v) => v.toLowerCase() === p.toLowerCase()))]);
    setText('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-line-control bg-surface px-2 py-1.5 focus-within:border-accent focus-within:outline-2 focus-within:outline-accent/30">
        {value.map((v) => (
          <span key={v} className="inline-flex h-7 items-center gap-1 rounded-md bg-accent-soft pr-1 pl-2.5 text-sm font-medium text-accent">
            {v}
            <button type="button" aria-label={t('intel.tag.remove', { item: v })} className="inline-flex size-5 items-center justify-center rounded hover:bg-black/10" onClick={() => onChange(value.filter((x) => x !== v))}>
              <Icon name="x" size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          onBlur={commit}
          placeholder={value.length ? '' : placeholder}
          className={cx('h-7 min-w-24 grow bg-transparent px-1 text-[15px] outline-none placeholder:text-ink-subtle')}
        />
      </div>
      {hint ? <span className="text-sm text-ink-subtle">{hint}</span> : null}
    </div>
  );
}
