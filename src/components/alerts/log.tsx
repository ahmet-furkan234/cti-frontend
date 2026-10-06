'use client';

import { useMemo, useState } from 'react';
import { Card, ruleName } from '@/components/alerts/shared';
import { Button, Icon, StateBlock, cx, type IconName } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { dayOfMinutesAgo } from '@/lib/alerts';
import { formatTime } from '@/lib/format';
import type { Channel, LogEntry, Rule } from '@/mocks/alerts';

const RESULTS = ['all', 'sent', 'throttled', 'failed'] as const;
type Filter = (typeof RESULTS)[number];
const RESULT_STYLE: Record<LogEntry['result'], { icon: IconName; badge: string; text: string }> = {
  sent: { icon: 'check', badge: 'bg-low-soft text-low-ink', text: 'text-low-ink' },
  throttled: { icon: 'minus', badge: 'bg-surface-2 text-ink-muted', text: 'text-ink-muted' },
  failed: { icon: 'x', badge: 'bg-critical-soft text-critical-ink', text: 'text-critical-ink' },
};

export function LogFeed({ log, rules, channels, onRetry }: { log: LogEntry[]; rules: Rule[]; channels: Channel[]; onRetry?: (id: string) => void }) {
  const { t, lang } = useI18n();
  const [filter, setFilter] = useState<Filter>('all');
  const ruleById = new Map(rules.map((r) => [r.id, r]));
  const channelById = new Map(channels.map((c) => [c.id, c]));

  const groups = useMemo(() => {
    const out: { day: string; items: LogEntry[] }[] = [];
    for (const e of [...log].sort((a, b) => a.min - b.min).filter((x) => filter === 'all' || x.result === filter)) {
      const day = dayOfMinutesAgo(e.min);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(e);
      else out.push({ day, items: [e] });
    }
    return out;
  }, [log, filter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('alerts.tab.log')}>
        {RESULTS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cx('h-9 rounded-full border px-3.5 text-sm font-medium transition-colors', filter === f ? 'border-transparent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink-muted hover:text-ink')}
          >
            {f === 'all' ? t('alerts.log.f.all') : t(`alerts.res.${f}` as MessageKey)}
          </button>
        ))}
      </div>
      {groups.length === 0 ? (
        <Card><StateBlock kind="empty" compact title={t('alerts.log.empty')} /></Card>
      ) : (
        <Card className="px-5">
          {groups.map((g) => (
            <section key={g.day} className="border-b border-line py-5 last:border-b-0">
              <h3 className="mb-4 text-sm font-semibold text-ink-muted">{g.day === 'today' || g.day === 'yesterday' ? t(`alerts.day.${g.day}`) : g.day}</h3>
              <ul className="m-0 flex list-none flex-col gap-5 p-0">
                {g.items.map((e) => {
                  const rule = ruleById.get(e.ruleId);
                  const style = RESULT_STYLE[e.result];
                  const names = e.channelIds.map((id) => channelById.get(id)?.name).filter(Boolean).join(', ');
                  return (
                    <li key={e.id} className="flex items-start gap-4">
                      <span className={cx('inline-flex size-9 shrink-0 items-center justify-center rounded-full', style.badge)}><Icon name={style.icon} size={16} /></span>
                      <div className="min-w-0 grow">
                        <div className="flex flex-wrap items-baseline gap-x-3">
                          <span className="font-medium">{rule ? ruleName(rule, lang) : e.ruleId ? t('alerts.log.ruleGone') : t('alerts.log.watchlist')}</span>
                          <span className={cx('text-sm font-medium', style.text)}>{t(`alerts.res.${e.result}` as MessageKey)}</span>
                        </div>
                        <p className="m-0 text-sm text-ink-muted">{e.detail[lang]}</p>
                        {names ? <p className="m-0 text-sm text-ink-subtle">{names}</p> : null}
                        {e.result === 'failed' && onRetry ? (
                          <div className="mt-2"><Button size="sm" icon="refresh" onClick={() => onRetry(e.id)}>{t('alerts.log.retry')}</Button></div>
                        ) : null}
                      </div>
                      <time className="shrink-0 pt-1 text-sm text-ink-muted tabular-nums">{formatTime(new Date(Date.now() - e.min * 60_000))}</time>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </Card>
      )}
    </div>
  );
}

