'use client';

import { SeverityBadge } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { SEVERITY_BY_LEVEL, type Severity } from '@/lib/severity';
import type { CveStats } from '@/lib/types';

const DAY = 86_400_000;

/** Fills gaps so the line covers each of the last `days` calendar days (UTC). */
export function fillDays(points: { day: string; count: number }[], days = 30, now = Date.now()): { day: string; count: number }[] {
  const byDay = new Map(points.map((p) => [p.day, p.count]));
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(now - (days - 1 - i) * DAY).toISOString().slice(0, 10);
    return { day, count: byDay.get(day) ?? 0 };
  });
}

export function niceMax(max: number): number {
  if (max <= 0) return 10;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

export function DailyChart({ points }: { points: { day: string; count: number }[] }) {
  const { t, locale } = useI18n();
  const data = fillDays(points);
  const W = 740;
  const H = 208;
  const left = 40;
  const top = 16;
  const bottom = 160;
  const max = niceMax(Math.max(...data.map((d) => d.count)));
  const x = (i: number) => left + 8 + (i * (W - left - 18)) / (data.length - 1);
  const y = (v: number) => bottom - (v / max) * (bottom - top);
  const line = data.map((d, i) => `${x(i).toFixed(1)},${y(d.count).toFixed(1)}`).join(' ');
  const peak = Math.max(...data.map((d) => d.count));
  const last = data[data.length - 1]!;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const mid = data[Math.floor(data.length / 2)]!;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={t('dash.trend.aria', { max: peak })} style={{ display: 'block', maxHeight: 240 }}>
      <g style={{ stroke: 'var(--border)', strokeWidth: 1 }}>
        {ticks.map((v) => (
          <line key={v} x1={left} y1={y(v)} x2={W} y2={y(v)} />
        ))}
      </g>
      <g style={{ fill: 'var(--ink-subtle)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
        {ticks.map((v) => (
          <text key={v} x={0} y={y(v) + 4}>{formatNumber(v, locale)}</text>
        ))}
        <text x={left} y={184}>{data[0]!.day.slice(5)}</text>
        <text x={x(Math.floor(data.length / 2)) - 14} y={184}>{mid.day.slice(5)}</text>
        <text x={W - 34} y={184}>{last.day.slice(5)}</text>
      </g>
      <polyline points={line} style={{ fill: 'none', stroke: 'var(--chart-1)', strokeWidth: 2, strokeLinejoin: 'round' }} />
      <circle cx={x(data.length - 1)} cy={y(last.count)} r={4} style={{ fill: 'var(--chart-1)' }} />
      <text x={x(data.length - 1) - 34} y={Math.max(12, y(last.count) - 8)} style={{ fill: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500 }}>
        {formatNumber(last.count, locale)}
      </text>
    </svg>
  );
}

const DONUT_ORDER: Severity[] = ['critical', 'high', 'medium', 'low'];

export function SeverityDonut({ data }: { data: CveStats['severityDistribution'] }) {
  const { t, locale } = useI18n();
  const counts = DONUT_ORDER.map((s) => ({ id: s, n: data.find((d) => SEVERITY_BY_LEVEL[d.severity] === s)?.count ?? 0 }));
  const total = counts.reduce((a, c) => a + c.n, 0);
  const R = 60;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const segs = counts.map((c) => {
    const len = total > 0 ? (c.n / total) * C : 0;
    const seg = { ...c, len, offset };
    offset += len;
    return seg;
  });

  return (
    <div className="row" style={{ gap: 20, flexGrow: 1, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
        <svg width={160} height={160} viewBox="0 0 160 160" role="img" aria-label={`${t('dash.sev.aria')}: ${counts.map((c) => `${t(`sev.${c.id}`)} ${c.n}`).join(', ')}`}>
          <g transform="rotate(-90 80 80)" style={{ fill: 'none', strokeWidth: 18 }}>
            <circle cx={80} cy={80} r={R} style={{ stroke: 'var(--surface-3)' }} />
            {segs.filter((s) => s.len > 0).map((s) => (
              <circle key={s.id} cx={80} cy={80} r={R} className={`cti-stroke--${s.id}`} strokeDasharray={`${Math.max(0, s.len - 1.5)} ${C}`} strokeDashoffset={-s.offset} />
            ))}
          </g>
        </svg>
        <div className="col" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 600 }}>{formatNumber(total, locale)}</span>
          <span className="muted" style={{ fontSize: 11, lineHeight: '16px' }}>{t('dash.sev.total')}</span>
        </div>
      </div>
      <div className="col grow" style={{ gap: 10, minWidth: 140 }}>
        {counts.map((c) => (
          <div key={c.id} className="row">
            <SeverityBadge severity={c.id} />
            <span className="grow" />
            <span className="mono-12">{formatNumber(c.n, locale)}</span>
            <span className="mono-11 muted right" style={{ width: 36 }}>{total > 0 ? `${Math.round((c.n / total) * 100)}%` : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
