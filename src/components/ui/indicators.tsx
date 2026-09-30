'use client';

import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from './icon';
import { cx } from './controls';
import { Skeleton } from './layout';
import { useT, type MessageKey } from '@/i18n';
import { epssTone, riskTone, scorePassword, severityFromScore, type Severity } from '@/lib/severity';

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
  return (
    <span className={cx('cti-sev', `cti-sev--${sev}`, compact && 'cti-sev--compact', className)} title={compact ? label : undefined}>
      <span className="cti-sev__dot" aria-hidden="true" />
      {compact ? <span className="cti-sr">{label}</span> : <span>{label}</span>}
      {score != null ? <span className="cti-sev__score">{Number(score).toFixed(1)}</span> : null}
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
      className={cx('cti-kev', iconOnly && 'cti-kev--icon', className)}
      title={t('kev.title') + (dateAdded ? ` · ${t('kev.addedOn', { date: dateAdded })}` : '')}
      aria-label={iconOnly ? label : undefined}
    >
      <Icon name="flame" size={13} />
      {iconOnly ? null : <span>{label}</span>}
      {ransomware ? <span className="cti-kev__rw">{t('kev.ransomware')}</span> : null}
    </span>
  );
}

/* ---------- EpssMeter ---------- */
export function formatPct(v: number): string {
  const p = v * 100;
  return `${p >= 10 ? p.toFixed(0) : p >= 1 ? p.toFixed(1) : p.toFixed(2)}%`;
}

export function EpssMeter({ value, percentile, variant = 'bar' }: { value: number; percentile?: number; variant?: 'bar' | 'gauge' }) {
  const t = useT();
  const v = Math.max(0, Math.min(1, value || 0));
  const tone = epssTone(v);
  if (variant === 'gauge') {
    const r = 44;
    const c = Math.PI * r;
    return (
      <div className="cti-epss-gauge" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label="EPSS">
        <svg width={112} height={64} viewBox="0 0 112 64" aria-hidden="true">
          <path d="M12 56a44 44 0 0 1 88 0" className="cti-epss-gauge__track" />
          <path d="M12 56a44 44 0 0 1 88 0" className={`cti-epss-gauge__val cti-stroke--${tone}`} strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
        </svg>
        <div className="cti-epss-gauge__num">{formatPct(v)}</div>
        {percentile != null ? (
          <div className="cti-epss-gauge__pct">
            {t('epss.percentile')} {Math.round(percentile * 100)}
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <span className="cti-epss" title={percentile != null ? `${t('epss.percentile')} ${Math.round(percentile * 100)}` : undefined}>
      <span className="cti-epss__num">{formatPct(v)}</span>
      <span className="cti-epss__track" aria-hidden="true">
        <span className={`cti-epss__fill cti-bg--${tone}`} style={{ width: `${Math.max(2, v * 100)}%` }} />
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
    <span className="cti-ring" style={{ width: size, height: size }} role="img" aria-label={`${t('risk.score')} ${s}/100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="cti-ring__track" strokeWidth={sw} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className={`cti-ring__val cti-stroke--${tone}`}
          strokeWidth={sw}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - s / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="cti-ring__num" style={{ fontSize: size >= 48 ? 15 : 11 }}>
        {s}
      </span>
    </span>
  );
}

/* ---------- SlaChip ---------- */
export function SlaChip({ hoursLeft, warnHours = 72, dueAt }: { hoursLeft: number; warnHours?: number; dueAt?: string }) {
  const t = useT();
  const state = hoursLeft < 0 ? 'breached' : hoursLeft <= warnHours ? 'warning' : 'ok';
  const abs = Math.abs(hoursLeft);
  const txt = abs >= 48 ? `${Math.round(abs / 24)}${t('sla.d')}` : `${Math.round(abs)}${t('sla.h')}`;
  const text = state === 'breached' ? `${t('sla.breached')} ${txt}` : `${txt} ${t('sla.left')}`;
  return (
    <span className={cx('cti-sla', `cti-sla--${state}`)} title={dueAt ? t('sla.due', { date: dueAt }) : undefined}>
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
};

export function StatusPill({ status, label, className }: { status: string; label?: string; className?: string }) {
  const t = useT();
  const tone = STATUS_TONE[status] ?? 'muted';
  const text = label ?? (STATUS_TONE[status] ? t(`status.${status}` as MessageKey) : status);
  return (
    <span className={cx('cti-status', `cti-status--${tone}`, className)}>
      <span className="cti-status__dot" aria-hidden="true" />
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
    <span className={cx('cti-mono', strong && 'cti-mono--strong', truncate && 'cti-mono--trunc', className)} title={truncate ? String(children) : undefined}>
      <span className="cti-mono__text">{href ? <a href={href} className="cti-mono__link">{children}</a> : children}</span>
      {copy ? (
        <button type="button" className="cti-mono__copy" onClick={doCopy} aria-label={copied ? t('common.copied') : t('common.copy')}>
          <Icon name={copied ? 'check' : 'copy'} size={12} />
        </button>
      ) : null}
    </span>
  );
}

/* ---------- StatTile (KPI) ---------- */
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
    <div className={cx('cti-stat', tone && `cti-stat--${tone}`)}>
      <div className="cti-stat__label">
        {icon ? <Icon name={icon} size={13} /> : null}
        {label}
      </div>
      {loading ? <Skeleton width={72} height={28} /> : <div className="cti-stat__value">{value}</div>}
      <div className="cti-stat__foot">
        {delta != null ? (
          <span className={`cti-stat__delta cti-stat__delta--${deltaTone}`}>
            <Icon name={dir === 'flat' ? 'minus' : dir} size={12} />
            {(delta > 0 ? '+' : '') + delta + (deltaSuffix ?? '')}
          </span>
        ) : null}
        {hint ? <span className="cti-stat__hint">{hint}</span> : null}
      </div>
    </div>
  );
}

/* ---------- TriStateToggle: Inherit / Grant / Deny ---------- */
export type TriValue = 'inherit' | 'grant' | 'deny';

export function TriStateToggle({
  value,
  onChange,
  inherited,
  via,
  why,
  showEffective,
  compact,
  label,
}: {
  value: TriValue;
  onChange: (v: TriValue) => void;
  inherited?: boolean;
  via?: string;
  why?: string;
  showEffective?: boolean;
  compact?: boolean;
  label?: string;
}) {
  const t = useT();
  const opts: [TriValue, string, IconName][] = [
    ['inherit', t('tri.inherit'), 'minus'],
    ['grant', t('tri.grant'), 'check'],
    ['deny', t('tri.deny'), 'x'],
  ];
  const effective = value === 'inherit' ? (inherited ? 'grant' : 'deny') : value;
  return (
    <div className="cti-tri-wrap">
      <div className="cti-tri" role="radiogroup" aria-label={label}>
        {opts.map(([id, text, icon]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={id === value}
            className={cx('cti-tri__opt', `cti-tri__opt--${id}`, id === value && 'is-on')}
            onClick={() => onChange(id)}
            title={text}
          >
            <Icon name={icon} size={12} />
            {compact ? <span className="cti-sr">{text}</span> : <span>{text}</span>}
          </button>
        ))}
      </div>
      {showEffective ? (
        <span className={`cti-tri__eff cti-tri__eff--${effective}`} title={why}>
          {effective === 'grant' ? t('tri.allowed') : t('tri.denied')}
          {value === 'inherit' && via ? <span className="cti-tri__via">{t('tri.via')} {via}</span> : null}
        </span>
      ) : null}
    </div>
  );
}

/* ---------- PasswordStrength ---------- */
export function PasswordStrength({ password, hint }: { password: string; hint?: string }) {
  const t = useT();
  const s = scorePassword(password);
  const tone = (['none', 'critical', 'high', 'medium', 'low'] as const)[s]!;
  return (
    <div className="cti-pw">
      <div className="cti-pw__bar" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="cti-pw__seg" style={i < s ? { background: `var(--${tone})` } : undefined} />
        ))}
      </div>
      <div className="cti-pw__label" aria-live="polite">
        <span className={`cti-pw__word cti-text--${tone}`}>{t(`pw.${s}` as MessageKey)}</span>
        {hint ? <span className="cti-pw__hint">{hint}</span> : null}
      </div>
    </div>
  );
}
