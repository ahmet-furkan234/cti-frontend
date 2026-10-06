'use client';

import { cx } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { CHANNEL_KINDS } from '@/lib/alerts';
import type { Channel, ChannelStatus, Rule } from '@/mocks/alerts';

/** User-written names are plain strings; seeded demo rules carry both languages. */
export function ruleName(rule: Pick<Rule, 'name'>, lang: 'tr' | 'en'): string {
  return typeof rule.name === 'string' ? rule.name : rule.name[lang];
}

const STATUS_STYLE: Record<ChannelStatus, { dot: string; text: string }> = {
  healthy: { dot: 'bg-low', text: 'text-low-ink' },
  degraded: { dot: 'bg-medium', text: 'text-medium-ink' },
  failing: { dot: 'bg-critical', text: 'text-critical-ink' },
};

export function ChannelStatusPill({ status }: { status: ChannelStatus }) {
  const { t } = useI18n();
  const s = STATUS_STYLE[status];
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap', s.text)}>
      <span className={cx('size-2 rounded-full', s.dot)} aria-hidden="true" />
      {t(`alerts.st.${status}` as MessageKey)}
    </span>
  );
}

export function KindBadge({ kind, size = 40 }: { kind: Channel['kind']; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-surface-2 text-xs font-semibold text-ink-muted"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {CHANNEL_KINDS[kind].abbr}
    </span>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cx('min-w-0 rounded-xl border border-line bg-surface shadow-card', className)}>{children}</section>;
}

