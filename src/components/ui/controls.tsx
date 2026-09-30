'use client';

import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { Icon, type IconName } from './icon';
import { useT } from '@/i18n';

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/* ---------- Button ---------- */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: IconName;
}

export function Button({ variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cx('cti-btn', `cti-btn--${variant}`, `cti-btn--${size}`, className)}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
    >
      {loading ? <Icon name="loader" spin /> : icon ? <Icon name={icon} /> : null}
      {children != null && children !== false ? <span>{children}</span> : null}
    </button>
  );
}

/** Anchor styled as a button (navigation). */
export function buttonClass(variant: ButtonProps['variant'] = 'secondary', size: ButtonProps['size'] = 'md') {
  return cx('cti-btn', `cti-btn--${variant}`, `cti-btn--${size}`);
}

/* ---------- Kbd ---------- */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cx('cti-kbd', className)}>{children}</kbd>;
}

/* ---------- TextField ---------- */
interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
}

export function TextField({ label, hint, error, mono, className, id, ...rest }: TextFieldProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={cx('cti-field', error && 'is-invalid', className)}>
      {label ? (
        <label className="cti-field__label" htmlFor={fid}>
          {label}
        </label>
      ) : null}
      <input
        {...rest}
        id={fid}
        className={cx('cti-input', mono && 'cti-input--mono')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fid}-d` : undefined}
      />
      {error || hint ? (
        <div id={`${fid}-d`} className={error ? 'cti-field__error' : 'cti-field__hint'}>
          {error ? <Icon name="alert" size={12} /> : null}
          {error || hint}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- SearchInput ("/" focuses it from anywhere) ---------- */
interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'md' | 'lg';
  meta?: ReactNode;
  /** Key that focuses the field; pass null to disable. Defaults to "/". */
  shortcut?: string | null;
}

export function SearchInput({ size = 'md', meta, shortcut = '/', className, placeholder, ...rest }: SearchInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (e.key !== shortcut || e.metaKey || e.ctrlKey || e.altKey) return;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      e.preventDefault();
      ref.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcut]);

  return (
    <div className={cx('cti-search', size === 'lg' && 'cti-search--lg', className)}>
      <Icon name="search" size={size === 'lg' ? 16 : 14} />
      <input
        type="search"
        aria-label={placeholder ?? 'Search'}
        placeholder={placeholder}
        {...rest}
        ref={ref}
        className="cti-search__input"
      />
      {meta ? <span className="cti-search__meta">{meta}</span> : null}
      {shortcut ? <Kbd>{shortcut}</Kbd> : null}
    </div>
  );
}

/* ---------- Tag ---------- */
export function Tag({
  tone = 'neutral',
  icon,
  onRemove,
  children,
  className,
}: {
  tone?: 'neutral' | 'accent' | 'exposed';
  icon?: IconName;
  onRemove?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const t = useT();
  return (
    <span className={cx('cti-tag', `cti-tag--${tone}`, className)}>
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
      {onRemove ? (
        <button type="button" className="cti-tag__x" onClick={onRemove} aria-label={t('common.remove')}>
          <Icon name="x" size={11} />
        </button>
      ) : null}
    </span>
  );
}

/* ---------- Checkbox ---------- */
export function Checkbox(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" {...props} className={cx('cti-check', props.className)} />;
}
