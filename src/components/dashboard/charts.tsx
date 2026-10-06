'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SeverityBadge, cx } from '@/components/ui';
import { useI18n } from '@/i18n';
import { fillDays, niceMax, percentOf } from '@/lib/dashboard';
import { formatNumber } from '@/lib/format';
import { SEVERITY_BY_LEVEL, type Severity } from '@/lib/severity';
import type { CveStats } from '@/lib/types';

const W = 760;
const H = 310;
const LEFT = 36;
const TOP = 14;
const BOTTOM = 268;

/** 30-day line with a soft area underneath; hover or focus a point to read the exact day. */
export function DailyChart({ points }: { points: { day: string; count: number }[] }) {
  const { t, locale } = useI18n();
  const [hover, setHover] = useState<number | null>(null);
  const data = fillDays(points);
  const max = niceMax(Math.max(...data.map((d) => d.count)));
  const x = (i: number) => LEFT + 6 + (i * (W - LEFT - 16)) / (data.length - 1);
  const y = (v: number) => BOTTOM - (v / max) * (BOTTOM - TOP);
  const line = data.map((d, i) => `${x(i).toFixed(1)},${y(d.count).toFixed(1)}`).join(' ');
  const area = `${x(0)},${BOTTOM} ${line} ${x(data.length - 1)},${BOTTOM}`;
  const peak = Math.max(...data.map((d) => d.count));
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const shown = hover ?? data.length - 1;
  const cur = data[shown]!;
  const label = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - LEFT - 6) / (W - LEFT - 16)) * (data.length - 1)))));
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={t('dash.trend.aria', { max: peak })}
        className="block max-h-[340px] touch-none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="dash-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={LEFT} y1={y(v)} x2={W} y2={y(v)} stroke="var(--line)" strokeDasharray={v === 0 ? undefined : '3 4'} />
            <text x={0} y={y(v) + 4} fontSize="12" fill="var(--ink-subtle)">{formatNumber(v, locale)}</text>
          </g>
        ))}
        <polygon points={area} fill="url(#dash-area)" />
        <polyline points={line} fill="none" stroke="var(--chart-1)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 10} fontSize="12" fill="var(--ink-subtle)" textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>{label(data[i]!.day)}</text>
        ))}
        {hover !== null ? <line x1={x(shown)} y1={TOP} x2={x(shown)} y2={BOTTOM} stroke="var(--line-strong)" /> : null}
        <circle cx={x(shown)} cy={y(cur.count)} r={5} fill="var(--surface)" stroke="var(--chart-1)" strokeWidth="2.5" />
      </svg>
      <div className="pointer-events-none mt-1 flex items-baseline gap-2 text-sm text-ink-muted" aria-live="polite">
        <span className="font-semibold text-ink tabular-nums">{t('dash.trend.tip', { n: formatNumber(cur.count, locale) })}</span>
        <span>{label(cur.day)}</span>
      </div>
    </div>
  );
}

const DONUT_ORDER: Severity[] = ['critical', 'high', 'medium', 'low'];
const DONUT_COLOR: Record<Severity, string> = { critical: 'var(--critical)', high: 'var(--high)', medium: 'var(--medium)', low: 'var(--low)', none: 'var(--neutral)' };

/** Severity split as a ring plus a legend whose rows open the CVE list filtered to that severity. */
export function SeverityDonut({ data }: { data: CveStats['severityDistribution'] }) {
  const { t, locale } = useI18n();
  const counts = DONUT_ORDER.map((s) => ({ id: s, n: data.find((d) => SEVERITY_BY_LEVEL[d.severity] === s)?.count ?? 0 }));
  const total = counts.reduce((a, c) => a + c.n, 0);
  const R = 62;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const segs = counts.map((c) => {
    const len = total > 0 ? (c.n / total) * C : 0;
    const seg = { ...c, len, offset };
    offset += len;
    return seg;
  });

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative size-44 shrink-0">
        <svg width="100%" height="100%" viewBox="0 0 176 176" role="img" aria-label={`${t('dash.sev.aria')}: ${counts.map((c) => `${t(`sev.${c.id}`)} ${c.n}`).join(', ')}`}>
          <g transform="rotate(-90 88 88)" fill="none" strokeWidth="18">
            <circle cx={88} cy={88} r={R} stroke="var(--surface-3)" />
            {segs.filter((s) => s.len > 0).map((s) => (
              <circle key={s.id} cx={88} cy={88} r={R} stroke={DONUT_COLOR[s.id]} strokeDasharray={`${Math.max(0, s.len - 2)} ${C}`} strokeDashoffset={-s.offset} />
            ))}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums">{formatNumber(total, locale)}</span>
          <span className="text-sm text-ink-muted">{t('dash.sev.total')}</span>
        </div>
      </div>
      <ul className="m-0 flex w-full list-none flex-col p-0">
        {counts.map((c) => (
          <li key={c.id}>
            <Link href={`/cves?severity=${c.id}`} title={t('dash.sev.view')} className="flex items-center gap-3 rounded-lg px-2 py-2 text-ink no-underline hover:bg-surface-2 hover:text-ink">
              <SeverityBadge severity={c.id} />
              <span className="grow" />
              <span className="font-medium tabular-nums">{formatNumber(c.n, locale)}</span>
              <span className="w-10 text-right text-sm text-ink-muted tabular-nums">{percentOf(c.n, total)}%</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bars for a short ranked list (vendors, weakness types). */
export function RankedBars({ rows, color }: { rows: { key: string; label: string; sub?: string; count: number; href?: string }[]; color: string }) {
  const { locale } = useI18n();
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
      {rows.map((r) => {
        const body = (
          <>
            <div className="flex items-baseline gap-3">
              <span className="min-w-0 grow truncate font-medium">{r.label}</span>
              <span className="text-sm text-ink-muted tabular-nums">{formatNumber(r.count, locale)}</span>
            </div>
            {r.sub ? <div className="-mt-0.5 text-sm text-ink-subtle">{r.sub}</div> : null}
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: color }} /></div>
          </>
        );
        return (
          <li key={r.key}>
            {r.href ? <Link href={r.href} className={cx('-mx-2 block rounded-lg px-2 py-1 text-ink no-underline hover:bg-surface-2 hover:text-ink')}>{body}</Link> : body}
          </li>
        );
      })}
    </ul>
  );
}

