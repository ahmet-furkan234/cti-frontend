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

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg border font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const BTN_VARIANT = {
  primary: 'border-transparent bg-accent text-on-accent enabled:hover:bg-accent-hover',
  secondary: 'border-line-strong bg-surface text-ink shadow-card enabled:hover:bg-surface-2',
  ghost: 'border-transparent text-ink-muted enabled:hover:bg-surface-2 enabled:hover:text-ink',
  danger: 'border-critical/40 bg-critical-soft text-critical-ink enabled:hover:border-critical',
} as const;
const BTN_SIZE = { md: 'h-10 px-4 text-[15px]', sm: 'h-8 px-3 text-sm' } as const;

/** Anchor styled as a button (navigation). */
export function buttonClass(variant: ButtonProps['variant'] = 'secondary', size: ButtonProps['size'] = 'md') {
  return cx(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], 'no-underline hover:no-underline', variant === 'primary' && 'text-on-accent hover:text-on-accent');
}

export function Button({ variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className)}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
    >
      {loading ? <Icon name="loader" spin /> : icon ? <Icon name={icon} /> : null}
      {children != null && children !== false ? <span>{children}</span> : null}
    </button>
  );
}

/** Square icon-only button used in toolbars and the sidebar. */
export function IconButton({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cx('inline-flex size-9 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink', className)}
    />
  );
}

/* ---------- Kbd ---------- */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cx('inline-flex h-5 min-w-5 items-center justify-center rounded border border-b-2 border-line-strong bg-surface-2 px-1 font-mono text-[11px] font-medium text-ink-muted', className)}>
      {children}
    </kbd>
  );
}

/* ---------- TextField ---------- */
export const INPUT_CLASS =
  'h-10 w-full min-w-0 rounded-lg border border-line-control bg-surface px-3 text-[15px] text-ink placeholder:text-ink-subtle focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/30 focus-visible:outline-offset-0 disabled:opacity-60';

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
    <div className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      {label ? (
        <label className="text-sm font-medium text-ink" htmlFor={fid}>
          {label}
        </label>
      ) : null}
      <input
        {...rest}
        id={fid}
        className={cx(INPUT_CLASS, mono && 'font-mono text-sm', error && 'border-critical')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fid}-d` : undefined}
      />
      {error || hint ? (
        <div id={`${fid}-d`} className={cx('flex items-center gap-1 text-sm', error ? 'text-critical-ink' : 'text-ink-subtle')}>
          {error ? <Icon name="alert" size={14} /> : null}
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
    <div
      className={cx(
        'relative flex items-center gap-2 rounded-lg border border-line-control bg-surface pr-2 text-ink-muted focus-within:border-accent focus-within:outline-2 focus-within:outline-accent/30',
        size === 'lg' ? 'h-13 pl-4' : 'h-10 pl-3',
        className,
      )}
    >
      <Icon name="search" size={size === 'lg' ? 20 : 16} />
      <input
        type="search"
        aria-label={placeholder ?? 'Search'}
        placeholder={placeholder}
        {...rest}
        ref={ref}
        className={cx('h-full min-w-0 flex-1 border-0 bg-transparent text-ink outline-none placeholder:text-ink-subtle', size === 'lg' ? 'text-base' : 'text-[15px]')}
      />
      {meta ? <span className="text-sm whitespace-nowrap text-ink-subtle">{meta}</span> : null}
      {shortcut ? <Kbd>{shortcut}</Kbd> : null}
    </div>
  );
}

/* ---------- Tag ---------- */
const TAG_TONE = {
  neutral: 'bg-surface-2 text-ink-muted',
  accent: 'bg-accent-soft text-accent',
  exposed: 'bg-high-soft text-high-ink',
} as const;

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
    <span className={cx('inline-flex h-6 items-center gap-1 rounded-md px-2 text-sm whitespace-nowrap', TAG_TONE[tone], className)}>
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
      {onRemove ? (
        <button type="button" className="-mr-1 inline-flex rounded p-0.5 hover:bg-black/10" onClick={onRemove} aria-label={t('common.remove')}>
          <Icon name="x" size={12} />
        </button>
      ) : null}
    </span>
  );
}

/* ---------- Checkbox ---------- */
export function Checkbox(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" {...props} className={cx('m-0 size-4 cursor-pointer accent-accent', props.className)} />;
}

/* ---------- Toggle / Switch ---------- */
/** Bare on/off control; give it an aria-label (or aria-labelledby) since it has no visible text. */
export function Toggle({
  checked,
  onChange,
  className,
  disabled,
  ...aria
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      {...aria}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx('relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50', checked ? 'bg-accent' : 'bg-line-control', className)}
    >
      <span className={cx('absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
    </button>
  );
}

/** A Toggle with a visible label and optional helper text. */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  id?: string;
}) {
  const uid = useId();
  const sid = id ?? uid;
  return (
    <div className="flex items-start gap-3">
      <Toggle id={sid} checked={checked} onChange={onChange} className="mt-0.5" aria-labelledby={`${sid}-l`} aria-describedby={hint ? `${sid}-h` : undefined} />
      <div className="flex flex-col">
        <label id={`${sid}-l`} htmlFor={sid} className="cursor-pointer text-[15px] font-medium text-ink">{label}</label>
        {hint ? <span id={`${sid}-h`} className="text-sm text-ink-muted">{hint}</span> : null}
      </div>
    </div>
  );
}
