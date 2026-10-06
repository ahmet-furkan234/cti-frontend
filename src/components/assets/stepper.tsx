import { Icon, cx } from '@/components/ui';

/** Horizontal progress through a wizard. Completed steps can be clicked to go back. */
export function Stepper({
  steps,
  current,
  onJump,
  label,
}: {
  steps: { id: string; label: string; hint: string }[];
  current: number;
  onJump?: (index: number) => void;
  label: string;
}) {
  return (
    <ol aria-label={label} className="m-0 flex list-none items-start gap-2 p-0">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const body = (
          <>
            <span
              className={cx(
                'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                active && 'bg-accent text-on-accent',
                done && 'bg-accent-soft text-accent',
                !active && !done && 'bg-surface-3 text-ink-muted',
              )}
            >
              {done ? <Icon name="check" size={16} strokeWidth={2.25} /> : i + 1}
            </span>
            <span className={cx('min-w-0 flex-col text-left', active ? 'flex' : 'hidden md:flex')}>
              <span className={cx('truncate font-medium', !active && !done && 'text-ink-muted')}>{s.label}</span>
              <span className="hidden truncate text-sm text-ink-muted lg:block">{s.hint}</span>
            </span>
          </>
        );
        return (
          <li key={s.id} aria-current={active ? 'step' : undefined} className={cx('flex items-center gap-3', i < steps.length - 1 ? 'min-w-0 grow' : 'shrink-0', !active && 'shrink-0 md:shrink')}>
            {done && onJump ? (
              <button type="button" className="flex items-center gap-3 rounded-lg" onClick={() => onJump(i)}>{body}</button>
            ) : (
              <div className="flex items-center gap-3">{body}</div>
            )}
            {i < steps.length - 1 ? <span aria-hidden="true" className={cx('hidden h-px min-w-6 grow md:block', done ? 'bg-accent' : 'bg-line-strong')} /> : null}
          </li>
        );
      })}
    </ol>
  );
}
