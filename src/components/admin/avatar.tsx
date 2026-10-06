import { initials } from '@/lib/format';

/** Soft, non-semantic tints so people are easy to tell apart (severity colors stay reserved for risk). */
const TINTS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
const tintOf = (id: string) => TINTS[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % TINTS.length]!;

export function Avatar({ user, size = 40 }: { user: { id: string; name: string }; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-ink"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `color-mix(in srgb, ${tintOf(user.id)} 22%, transparent)` }}
      aria-hidden="true"
    >
      {initials(user.name)}
    </span>
  );
}
