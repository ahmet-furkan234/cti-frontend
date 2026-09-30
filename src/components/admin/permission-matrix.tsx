'use client';

import { useEffect, useMemo, useState } from 'react';
import { Banner, Button, Icon, SearchInput, TriStateToggle, type TriValue } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { SENSITIVE_PERMISSIONS } from '@/lib/permissions';
import { permissionDescription } from '@/lib/perm-text';
import type { PermissionDef, PermissionOverride, Role } from '@/lib/types';

const COLS = { '--cols': '200px minmax(0, 1fr) 380px' } as React.CSSProperties;

export function overridesToDraft(overrides: PermissionOverride[]): Record<string, TriValue> {
  return Object.fromEntries(overrides.map((o) => [o.key, o.effect]));
}

export function draftToOverrides(draft: Record<string, TriValue>): PermissionOverride[] {
  return Object.entries(draft)
    .filter(([, v]) => v !== 'inherit')
    .map(([key, v]) => ({ key, effect: v as 'grant' | 'deny' }));
}

export function PermissionMatrix({
  catalog,
  userRoles,
  overrides,
  canEdit,
  saving,
  onSave,
}: {
  catalog: PermissionDef[];
  /** The user's roles WITH their permission keys (to explain inheritance) */
  userRoles: Role[];
  overrides: PermissionOverride[];
  canEdit: boolean;
  saving: boolean;
  onSave: (overrides: PermissionOverride[]) => void;
}) {
  const { t } = useI18n();
  const initial = useMemo(() => overridesToDraft(overrides), [overrides]);
  const initialKey = JSON.stringify(overrides);
  const [draft, setDraft] = useState<Record<string, TriValue>>(initial);
  const [search, setSearch] = useState('');
  useEffect(() => setDraft(overridesToDraft(JSON.parse(initialKey) as PermissionOverride[])), [initialKey]);

  const valueOf = (key: string): TriValue => draft[key] ?? 'inherit';
  const initialOf = (key: string): TriValue => initial[key] ?? 'inherit';
  const rolesFor = (key: string) => userRoles.filter((r) => r.permissionKeys.includes(key)).map((r) => r.name);
  const effective = (key: string) => (valueOf(key) === 'grant' ? true : valueOf(key) === 'deny' ? false : rolesFor(key).length > 0);

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const map = new Map<string, PermissionDef[]>();
    for (const p of catalog) {
      if (term && !`${p.key} ${permissionDescription(t, p)}`.toLowerCase().includes(term)) continue;
      map.set(p.module, [...(map.get(p.module) ?? []), p]);
    }
    return [...map.entries()];
  }, [catalog, search, t]);

  const changes = catalog.filter((p) => valueOf(p.key) !== initialOf(p.key));
  const allowedCount = catalog.filter((p) => effective(p.key)).length;
  const sensitive = changes.find((p) => SENSITIVE_PERMISSIONS.includes(p.key) && valueOf(p.key) === 'grant');

  const why = (p: PermissionDef) => {
    const v = valueOf(p.key);
    const via = rolesFor(p.key);
    return v === 'deny' ? t('perm.why.deny') : v === 'grant' ? t('perm.why.grant') : via.length ? t('perm.why.role', { role: via.join(', ') }) : t('perm.why.none');
  };

  return (
    <div className="split">
      <section className="card card--clip main col">
        <div className="card-toolbar">
          <SearchInput shortcut={null} style={{ width: 260 }} placeholder={t('perm.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
          <span className="grow" />
          <span className="sub">{t('perm.precedence')}</span>
        </div>
        <div className="scroll-x">
          <div className="trow trow--head" style={COLS}>
            <span>{t('perm.col.permission')}</span>
            <span>{t('perm.col.description')}</span>
            <span>{t('perm.col.override')}</span>
          </div>
          {groups.length === 0 ? <div className="muted" style={{ padding: 16 }}>{t('perm.noMatches')}</div> : null}
          {groups.map(([module, perms]) => (
            <div key={module}>
              <div className="trow trow--group" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>
                {t(`mod.${module}` as MessageKey)}
                <span className="subtle" style={{ fontWeight: 400 }}>{t('perm.countSuffix', { n: perms.length })}</span>
              </div>
              {perms.map((p) => {
                const changed = valueOf(p.key) !== initialOf(p.key);
                return (
                  <div key={p.key} className={`trow${changed ? ' trow--sel' : ''}`} style={{ ...COLS, height: 44 }}>
                    <span className="mono-12">{p.key}</span>
                    <span className="ellipsis muted" style={{ fontSize: 12 }}>{permissionDescription(t, p)}</span>
                    <div style={canEdit ? undefined : { opacity: 0.6, pointerEvents: 'none' }}>
                      <TriStateToggle
                        label={p.key}
                        value={valueOf(p.key)}
                        onChange={(v) => setDraft((d) => ({ ...d, [p.key]: v }))}
                        inherited={rolesFor(p.key).length > 0}
                        via={rolesFor(p.key).join(', ')}
                        why={why(p)}
                        showEffective
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <aside aria-label={t('perm.effective')} className="card card--pad col aside-320" style={{ gap: 14 }}>
        <h2 className="h2">{t('perm.effective')}</h2>
        <div className="grid grid-2" style={{ gap: 8 }}>
          <div className="kv-tile" style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: 22, lineHeight: '28px', fontWeight: 600 }}>{allowedCount}</div>
            <div className="sub">{t('perm.allowed')}</div>
          </div>
          <div className="kv-tile" style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: 22, lineHeight: '28px', fontWeight: 600 }}>{catalog.length - allowedCount}</div>
            <div className="sub">{t('perm.denied')}</div>
          </div>
        </div>
        <div className="col gap-8">
          <span className="caps">{changes.length ? t('perm.unsaved', { n: changes.length }) : t('perm.noChanges')}</span>
          {changes.map((p) => {
            const v = valueOf(p.key);
            return (
              <div key={p.key} className="row" style={{ fontSize: 12 }}>
                <span className="mono" style={{ width: 14, fontWeight: 600, color: v === 'grant' ? 'var(--low-ink)' : v === 'deny' ? 'var(--critical-ink)' : 'var(--ink-muted)' }}>
                  {v === 'grant' ? '+' : v === 'deny' ? '−' : '↺'}
                </span>
                <span className="mono grow">{p.key}</span>
                <span className="muted">{t(`perm.diff.${v}` as MessageKey)}</span>
              </div>
            );
          })}
        </div>
        {sensitive ? (
          <Banner tone="warning" title={t('perm.critical.title')}>
            <span>{t('perm.critical.text', { key: sensitive.key })}</span>
          </Banner>
        ) : null}
        {!canEdit ? (
          <Banner tone="info">
            <span className="row gap-6"><Icon name="lock" size={13} />{t('perm.readOnly')}</span>
          </Banner>
        ) : null}
        <span className="grow" />
        <div className="row">
          <Button variant="ghost" style={{ flexGrow: 1 }} disabled={changes.length === 0} onClick={() => setDraft(initial)}>{t('common.reset')}</Button>
          <Button variant="primary" icon="check" style={{ flexGrow: 1 }} loading={saving} disabled={!canEdit || changes.length === 0} onClick={() => onSave(draftToOverrides(draft))}>
            {t('perm.save', { n: changes.length })}
          </Button>
        </div>
      </aside>
    </div>
  );
}
