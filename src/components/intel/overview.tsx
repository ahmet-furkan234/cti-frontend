'use client';

import { Button, Icon, StateBlock, type IconName } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { useDemo } from '@/lib/demo';
import { tacticExposure } from '@/lib/intel';
import { ATTACK_TOP, type Ioc, type Watchlist } from '@/mocks/intel';

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-card">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {desc ? <p className="text-[15px] text-ink-muted">{desc}</p> : null}
      </div>
      {children}
    </section>
  );
}

interface Attention {
  key: string;
  icon: IconName;
  title: string;
  sub: string;
  go: () => void;
}

export function Overview({ iocs, watchlists, onOpenIoc, onOpenWatchlists }: {
  iocs: Ioc[];
  watchlists: Watchlist[];
  onOpenIoc: (id: string) => void;
  onOpenWatchlists: () => void;
}) {
  const { t, locale } = useI18n();
  const demo = useDemo();
  const items: Attention[] = [
    ...iocs.filter((i) => i.matches > 0).map((i) => ({
      key: i.id,
      icon: 'alert' as IconName,
      title: t('intel.attn.ioc', { value: i.value.length > 28 ? `${i.value.slice(0, 26)}…` : i.value, n: i.matches }),
      sub: t('intel.attn.iocSub', { kind: t(`intel.type.${i.type}` as MessageKey) }),
      go: () => onOpenIoc(i.id),
    })),
    ...watchlists.filter((w) => w.enabled && w.hits > 0).map((w) => ({
      key: w.id,
      icon: 'bell' as IconName,
      title: t('intel.attn.watch', { name: w.name, n: w.hits }),
      sub: t('intel.attn.watchSub'),
      go: onOpenWatchlists,
    })),
  ];
  const tactics = tacticExposure().sort((a, b) => b.score - a.score);
  const max = Math.max(1, ...tactics.map((x) => x.score));

  return (
    <div className="flex flex-col gap-5">
      <Card title={t('intel.attn.title')}>
        {items.length === 0 ? (
          <StateBlock kind="empty" compact title={t('intel.attn.empty')} />
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {items.map((x) => (
              <li key={x.key} className="flex items-center gap-4 border-t border-line py-3.5 first:border-t-0 first:pt-0 last:pb-0">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-critical-soft text-critical-ink"><Icon name={x.icon} size={18} /></span>
                <div className="min-w-0 grow">
                  <div className="font-medium">{x.title}</div>
                  <div className="text-sm text-ink-muted">{x.sub}</div>
                </div>
                <Button size="sm" onClick={x.go}>{t('intel.attn.open')}</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {demo ? <Card title={t('intel.attack.title')} desc={t('intel.attack.desc')}>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {tactics.map((x, i) => (
            <li key={x.tactic} className="grid grid-cols-[minmax(0,150px)_1fr_28px] items-center gap-3 sm:grid-cols-[180px_1fr_28px]">
              <span className="truncate text-[15px]">{t(`intel.tactic.${x.tactic}` as MessageKey)}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-surface-3">
                <span className="block h-full rounded-full" style={{ width: `${(x.score / max) * 100}%`, background: i === 0 ? 'var(--high)' : 'var(--chart-1)' }} />
              </span>
              <span className="text-right text-sm text-ink-muted tabular-nums">{x.score}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <h3 className="text-sm font-medium text-ink-muted">{t('intel.attack.top')}</h3>
          {ATTACK_TOP.map((x) => (
            <div key={x.id} className="flex items-center gap-3">
              <span className="grow text-[15px]">{t(`intel.tech.${x.id}` as MessageKey)}</span>
              <span className="shrink-0 text-sm text-ink-muted tabular-nums">{t('intel.attack.count', { n: x.count.toLocaleString(locale) })}</span>
            </div>
          ))}
        </div>
      </Card> : null}
    </div>
  );
}
