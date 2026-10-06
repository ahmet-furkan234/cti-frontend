'use client';

import type { ReactNode } from 'react';
import { Icon, cx, type IconName } from '@/components/ui';
import { useI18n } from '@/i18n';
import {
  accessState, actionLabel, areaDescription, areaIcon, areaTitle, roleLabel, toggleAction,
  type AccessArea, type AccessSource,
} from '@/lib/access';
import type { PermissionOverride, Role } from '@/lib/types';

/** One area of the product: icon, name, one-line purpose, and its actions on the right. */
function AreaRow({ area, children, actions }: { area: AccessArea; children: ReactNode; actions?: ReactNode }) {
  const { t } = useI18n();
  const description = areaDescription(t, area.module);
  return (
    <div className="flex flex-col gap-3 border-b border-line px-5 py-4 last:border-b-0 md:flex-row md:items-center md:gap-6">
      <div className="flex min-w-0 items-start gap-3 md:w-[240px] md:shrink-0">
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-muted">
          <Icon name={areaIcon(area.module)} size={18} />
        </span>
        <div className="min-w-0">
          <div className="font-medium">{areaTitle(t, area.module)}</div>
          {description ? <div className="text-sm text-ink-muted">{description}</div> : null}
        </div>
      </div>
      <div className="flex min-w-0 grow flex-wrap items-center gap-2">{children}</div>
      {actions}
    </div>
  );
}

/* ---------- Role editor: pick what a role can do ---------- */
export function AccessEditor({
  areas,
  keys,
  onChange,
  canChange,
}: {
  areas: AccessArea[];
  keys: string[];
  onChange: (keys: string[]) => void;
  /** Whether the current admin may flip this permission at all (they can only hand out what they hold). */
  canChange: (key: string) => boolean;
}) {
  const { t } = useI18n();
  const selected = new Set(keys);
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      {areas.map((area) => {
        const changeable = area.perms.filter((p) => canChange(p.key));
        const allOn = changeable.length > 0 && changeable.every((p) => selected.has(p.key));
        return (
          <AreaRow
            key={area.module}
            area={area}
            actions={
              changeable.length > 1 ? (
                <button
                  type="button"
                  className="self-start text-sm font-medium text-accent hover:underline md:self-center"
                  onClick={() =>
                    onChange(
                      allOn
                        ? keys.filter((k) => !changeable.some((p) => p.key === k))
                        : [...new Set([...keys, ...changeable.map((p) => p.key)])],
                    )
                  }
                >
                  {allOn ? t('access.clear') : t('access.all')}
                </button>
              ) : null
            }
          >
            {area.perms.map((p) => {
              const on = selected.has(p.key);
              const editable = canChange(p.key);
              return (
                <button
                  key={p.key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  disabled={!editable}
                  title={editable ? p.description : t('access.locked')}
                  onClick={() => onChange(toggleAction(keys, area, p.key, !on, canChange))}
                  className={cx(
                    'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed',
                    on ? 'border-transparent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink-muted enabled:hover:text-ink',
                    !editable && !on && 'opacity-50',
                  )}
                >
                  <Icon name={on ? 'check' : editable ? 'plus' : 'lock'} size={14} />
                  {actionLabel(t, p)}
                </button>
              );
            })}
          </AreaRow>
        );
      })}
    </div>
  );
}

/* ---------- User access: read-only result of roles + exceptions ---------- */
const STATE_STYLE: Record<AccessSource, { box: string; icon: IconName }> = {
  role: { box: 'bg-low-soft text-low-ink', icon: 'check' },
  extra: { box: 'bg-accent-soft text-accent', icon: 'plus' },
  blocked: { box: 'bg-critical-soft text-critical-ink line-through', icon: 'x' },
  none: { box: 'bg-surface-2 text-ink-subtle', icon: 'minus' },
};

export function AccessLegend() {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
      {(['role', 'extra', 'blocked', 'none'] as const).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className={cx('inline-flex size-5 items-center justify-center rounded-full', STATE_STYLE[s].box.replace(' line-through', ''))}>
            <Icon name={STATE_STYLE[s].icon} size={12} />
          </span>
          {t(`access.legend.${s}` as 'access.legend.role')}
        </span>
      ))}
    </div>
  );
}

export function AccessSummary({ areas, roles, overrides }: { areas: AccessArea[]; roles: Role[]; overrides: PermissionOverride[] }) {
  const { t } = useI18n();
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      {areas.map((area) => (
        <AreaRow key={area.module} area={area}>
          {area.perms.map((p) => {
            const st = accessState(p.key, roles, overrides);
            const why =
              st.source === 'role'
                ? t('access.state.role', { role: st.roles.map((r) => roleLabel(t, r)).join(', ') })
                : t(`access.state.${st.source}` as 'access.state.none');
            return (
              <span
                key={p.key}
                title={why}
                className={cx('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium', STATE_STYLE[st.source].box)}
              >
                <Icon name={STATE_STYLE[st.source].icon} size={13} />
                {actionLabel(t, p)}
              </span>
            );
          })}
        </AreaRow>
      ))}
    </div>
  );
}
