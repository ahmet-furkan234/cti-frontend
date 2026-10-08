'use client';

import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from './icon';
import { cx } from './controls';
import { Skeleton } from './layout';
import { TONE_BG, TONE_SOFT, TONE_STROKE, TONE_TEXT } from './tone';
import { useT, type MessageKey } from '@/i18n';
import { epssTone, hasEpss, riskTone, scorePassword, severityFromScore, type Severity } from '@/lib/severity';

/* ---------- SeverityBadge ---------- */
export function SeverityBadge({
  severity,
  score,
  compact,
  className,
}: {
  severity?: Severity;
  score?: number | null;
  compact?: boolean;
  className?: string;
}) {
  const t = useT();
  const sev = severity ?? severityFromScore(score);
  const label = t(`sev.${sev}` as MessageKey);
  // No score is not a severity: show it as a quiet "unscored" pill instead of a coloured "None".
  if (sev === 'none' && !compact) {
    return (
      <span className={cx('inline-flex h-6 items-center gap-1.5 rounded-full border border-dashed border-line-strong bg-surface-2 px-2.5 text-sm font-medium whitespace-nowrap text-ink-muted', className)}>
        <span className="w-2 border-t-[1.5px] border-current" aria-hidden="true" />
        {t('sev.unscored')}
      </span>
    );
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap',
        compact ? 'size-5 justify-center' : cx('h-6 rounded-full px-2.5', TONE_SOFT[sev]),
        className,
      )}
      title={compact ? label : undefined}
    >
      <span className={cx('rounded-full', compact ? 'size-2.5' : 'size-2', TONE_BG[sev])} aria-hidden="true" />
      {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
      {score != null ? <span className="border-l border-current/30 pl-1.5 tabular-nums">{Number(score).toFixed(1)}</span> : null}
    </span>
  );
}

/* ---------- KevFlag ---------- */
export function KevFlag({
  iconOnly,
  ransomware,
  dateAdded,
  className,
}: {
  iconOnly?: boolean;
  ransomware?: boolean;
  dateAdded?: string;
  className?: string;
}) {
  const t = useT();
  const label = t('kev.label');
  return (
    <span
      className={cx('inline-flex h-6 items-center gap-1 rounded-full bg-critical-soft text-sm font-semibold whitespace-nowrap text-critical-ink', iconOnly ? 'w-6 justify-center' : 'px-2.5', className)}
      title={t('kev.title') + (dateAdded ? ` · ${t('kev.addedOn', { date: dateAdded })}` : '')}
      aria-label={iconOnly ? label : undefined}
    >
      <Icon name="flame" size={13} />
      {iconOnly ? null : <span>{label}</span>}
      {ransomware ? <span className="border-l border-current/30 pl-1.5 font-medium">{t('kev.ransomware')}</span> : null}
    </span>
  );
}

/* ---------- EpssMeter ---------- */
export function formatPct(v: number): string {
  const p = v * 100;
  return `${p >= 10 ? p.toFixed(0) : p >= 1 ? p.toFixed(1) : p.toFixed(2)}%`;
}

/** Shown instead of a number when EPSS has not been calculated yet (see hasEpss). */
export function EpssPending({ className }: { className?: string }) {
  const t = useT();
  return (
    <span
      className={cx('inline-flex h-6 items-center gap-1.5 rounded-full border border-dashed border-line-strong bg-surface-2 px-2.5 text-sm font-medium whitespace-nowrap text-ink-muted', className)}
      title={t('epss.pending.desc')}
    >
      <Icon name="clock" size={12} />
      {t('epss.pending')}
    </span>
  );
}

export function EpssMeter({ value, percentile, variant = 'bar' }: { value: number; percentile?: number; variant?: 'bar' | 'gauge' }) {
  const t = useT();
  const v = Math.max(0, Math.min(1, value || 0));
  const tone = epssTone(v);
  const scored = hasEpss(v);
  if (variant === 'gauge' && !scored) return <EpssPending />;
  if (variant === 'gauge') {
    const r = 44;
    const c = Math.PI * r;
    return (
      <div className="relative inline-flex w-28 flex-col items-center" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label="EPSS">
        <svg width={112} height={64} viewBox="0 0 112 64" aria-hidden="true">
          <path d="M12 56a44 44 0 0 1 88 0" className="fill-none stroke-surface-3 stroke-8 [stroke-linecap:round]" />
          <path d="M12 56a44 44 0 0 1 88 0" className={cx('fill-none stroke-8 [stroke-linecap:round]', TONE_STROKE[tone])} strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
        </svg>
        <div className="-mt-6 text-xl font-semibold text-ink tabular-nums">{formatPct(v)}</div>
        {percentile != null ? (
          <div className="text-xs text-ink-muted">
            {t('epss.percentile')} {Math.round(percentile * 100)}
          </div>
        ) : null}
      </div>
    );
  }
  if (!scored) return <EpssPending />;
  return (
    <span className="inline-flex items-center gap-2" title={percentile != null ? `${t('epss.percentile')} ${Math.round(percentile * 100)}` : undefined}>
      <span className="min-w-11 text-right text-sm text-ink tabular-nums">{formatPct(v)}</span>
      <span className="relative h-1.5 w-12 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
        <span className={cx('absolute inset-y-0 left-0 rounded-full', TONE_BG[tone])} style={{ width: `${Math.max(2, v * 100)}%` }} />
      </span>
    </span>
  );
}

/* ---------- RiskRing ---------- */
export function RiskRing({ score, size = 32 }: { score: number; size?: number }) {
  const t = useT();
  const s = Math.max(0, Math.min(100, Math.round(score || 0)));
  const sw = size >= 48 ? 4 : 3;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const tone = riskTone(s);
  return (
    <span className="relative inline-flex flex-none items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${t('risk.score')} ${s}/100`}>
      <svg className="absolute inset-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="fill-none stroke-surface-3" strokeWidth={sw} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className={cx('fill-none [stroke-linecap:round]', TONE_STROKE[tone])}
          strokeWidth={sw}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - s / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="relative font-semibold text-ink tabular-nums" style={{ fontSize: size >= 48 ? 16 : 12 }}>
        {s}
      </span>
    </span>
  );
}

/* ---------- SlaChip ---------- */
const SLA_TONE = {
  ok: 'bg-surface-2 text-ink-muted',
  warning: 'bg-high-soft text-high-ink',
  breached: 'bg-critical-soft text-critical-ink ring-1 ring-critical/40',
} as const;

export function SlaChip({ hoursLeft, warnHours = 72, dueAt }: { hoursLeft: number; warnHours?: number; dueAt?: string }) {
  const t = useT();
  const state = hoursLeft < 0 ? 'breached' : hoursLeft <= warnHours ? 'warning' : 'ok';
  const abs = Math.abs(hoursLeft);
  const txt = abs >= 48 ? `${Math.round(abs / 24)}${t('sla.d')}` : `${Math.round(abs)}${t('sla.h')}`;
  const text = state === 'breached' ? `${t('sla.breached')} ${txt}` : `${txt} ${t('sla.left')}`;
  return (
    <span className={cx('inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-sm font-medium whitespace-nowrap', SLA_TONE[state])} title={dueAt ? t('sla.due', { date: dueAt }) : undefined}>
      <Icon name={state === 'breached' ? 'alert' : 'clock'} size={12} />
      <span>{text}</span>
    </span>
  );
}

/* ---------- StatusPill ---------- */
const STATUS_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'accent' | 'muted'> = {
  active: 'ok', stale: 'warn', archived: 'muted',
  open: 'danger', in_progress: 'accent', mitigated: 'ok', accepted: 'warn', false_positive: 'muted',
  invited: 'accent', disabled: 'muted', locked: 'danger',
  healthy: 'ok', degraded: 'warn', failing: 'danger', running: 'accent', idle: 'muted',
  ready: 'ok', generating: 'accent', failed: 'danger',
};

const STATUS_DOT = {
  ok: 'bg-low',
  warn: 'bg-medium',
  danger: 'bg-critical',
  accent: 'bg-accent',
  muted: 'bg-transparent ring-[1.5px] ring-ink-subtle ring-inset',
} as const;

export function StatusPill({ status, label, className }: { status: string; label?: string; className?: string }) {
  const t = useT();
  const tone = STATUS_TONE[status] ?? 'muted';
  const text = label ?? (STATUS_TONE[status] ? t(`status.${status}` as MessageKey) : status);
  return (
    <span className={cx('inline-flex items-center gap-2 text-sm whitespace-nowrap', tone === 'muted' ? 'text-ink-muted' : 'text-ink', className)}>
      <span className={cx('size-2 rounded-full', STATUS_DOT[tone])} aria-hidden="true" />
      {text}
    </span>
  );
}

/* ---------- MonoText ---------- */
export function MonoText({
  children,
  copy,
  truncate,
  strong,
  href,
  value,
  className,
}: {
  children: ReactNode;
  copy?: boolean;
  truncate?: boolean;
  strong?: boolean;
  href?: string;
  /** Text to copy when children is not a plain string */
  value?: string;
  className?: string;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    const text = typeof children === 'string' ? children : (value ?? '');
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <span className={cx('group/mono inline-flex max-w-full items-center gap-1 font-mono text-[13px] text-ink', strong && 'font-medium', className)} title={truncate ? String(children) : undefined}>
      <span className={cx(truncate && 'overflow-hidden text-ellipsis whitespace-nowrap')}>{href ? <a href={href} className="hover:underline">{children}</a> : children}</span>
      {copy ? (
        <button type="button" className="inline-flex rounded p-0.5 text-ink-subtle opacity-0 group-hover/mono:opacity-100 hover:bg-surface-3 hover:text-ink focus-visible:opacity-100" onClick={doCopy} aria-label={copied ? t('common.copied') : t('common.copy')}>
          <Icon name={copied ? 'check' : 'copy'} size={12} />
        </button>
      ) : null}
    </span>
  );
}

/* ---------- StatTile (KPI) ---------- */
const DELTA_TONE = { bad: 'text-critical-ink', good: 'text-low-ink', flat: 'text-ink-muted' } as const;

export function StatTile({
  label,
  value,
  icon,
  tone,
  delta,
  deltaSuffix,
  goodWhenUp,
  hint,
  loading,
}: {
  label: string;
  value: ReactNode;
  icon?: IconName;
  tone?: 'critical' | 'kev';
  delta?: number | null;
  deltaSuffix?: string;
  goodWhenUp?: boolean;
  hint?: string;
  loading?: boolean;
}) {
  const dir = delta == null || delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down';
  const deltaTone = dir === 'flat' ? 'flat' : (dir === 'up') === (goodWhenUp === true) ? 'good' : 'bad';
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center gap-2 text-sm font-medium text-ink-muted">
        {icon ? <Icon name={icon} size={16} className={tone ? 'text-critical-ink' : undefined} /> : null}
        {label}
      </div>
      {loading ? <Skeleton width={72} height={32} /> : <div className="text-3xl leading-9 font-semibold text-ink tabular-nums">{value}</div>}
      <div className="flex min-h-5 items-center gap-2 text-sm">
        {delta != null ? (
          <span className={cx('inline-flex items-center gap-0.5 font-medium tabular-nums', DELTA_TONE[deltaTone])}>
            <Icon name={dir === 'flat' ? 'minus' : dir} size={14} />
            {(delta > 0 ? '+' : '') + delta + (deltaSuffix ?? '')}
          </span>
        ) : null}
        {hint ? <span className="text-ink-subtle">{hint}</span> : null}
      </div>
    </div>
  );
}

/* ---------- PasswordStrength ---------- */
export function PasswordStrength({ password, hint }: { password: string; hint?: string }) {
  const t = useT();
  const s = scorePassword(password);
  const tone = (['none', 'critical', 'high', 'medium', 'low'] as const)[s]!;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-4 gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cx('h-1.5 rounded-full', i < s ? TONE_BG[tone] : 'bg-surface-3')} />
        ))}
      </div>
      <div className="flex justify-between gap-2 text-sm" aria-live="polite">
        <span className={cx('font-medium', TONE_TEXT[tone])}>{t(`pw.${s}` as MessageKey)}</span>
        {hint ? <span className="text-ink-subtle">{hint}</span> : null}
      </div>
    </div>
  );
}
