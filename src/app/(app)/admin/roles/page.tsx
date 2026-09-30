'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminTabs, errorMessage } from '@/components/admin/admin-parts';
import { useAuth } from '@/components/auth-provider';
import { PageHeader, RequirePermission } from '@/components/shell/page-guard';
import { Banner, Button, Checkbox, Icon, SearchInput, Skeleton, StateBlock, Tag, TextField } from '@/components/ui';
import { usePermissionCatalog, useRoleMutations, useRoles } from '@/features/admin/hooks';
import { useI18n, type MessageKey } from '@/i18n';
import { PERMISSIONS as P } from '@/lib/permissions';
import { permissionDescription } from '@/lib/perm-text';
import type { PermissionDef, Role } from '@/lib/types';

const NEW = 'new';
const LIST_COLS = { '--cols': 'minmax(0, 1fr) 70px 70px' } as React.CSSProperties;

function RoleEditor({ role, catalog, onDone }: { role: Role | null; catalog: PermissionDef[]; onDone: (id: string | null) => void }) {
  const { t } = useI18n();
  const { can, user } = useAuth();
  const m = useRoleMutations();
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [keys, setKeys] = useState<string[]>(role?.permissionKeys ?? []);
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setKeys(role?.permissionKeys ?? []);
    setSaved(false);
    m.create.reset();
    m.update.reset();
    m.remove.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role?.id, role?.updatedAt]);

  const canManage = can(P.ROLE_MANAGE);
  const isSuper = role?.name === 'super_admin';
  const held = new Set(user?.permissions ?? []);
  const original = new Set(role?.permissionKeys ?? []);
  const selected = new Set(keys);
  const added = keys.filter((k) => !original.has(k));
  const removed = [...original].filter((k) => !selected.has(k));
  const dirty = !role || added.length > 0 || removed.length > 0 || name.trim() !== role.name || description.trim() !== role.description;

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const map = new Map<string, PermissionDef[]>();
    for (const p of catalog) {
      if (term && !`${p.key} ${permissionDescription(t, p)}`.toLowerCase().includes(term)) continue;
      map.set(p.module, [...(map.get(p.module) ?? []), p]);
    }
    return [...map.entries()];
  }, [catalog, search, t]);

  const toggleKey = (k: string, on: boolean) => setKeys((cur) => (on ? [...new Set([...cur, k])] : cur.filter((x) => x !== k)));
  // A permission can be added only if the actor holds it; removal is always possible.
  const addable = (k: string) => held.has(k) || selected.has(k);
  const editablePerm = (k: string) => canManage && !isSuper && addable(k);

  const save = () => {
    const body = { name: name.trim(), description: description.trim(), permissionKeys: keys };
    if (!role) {
      m.create.mutate(body, { onSuccess: (r) => onDone(r.id) });
    } else {
      m.update.mutate(
        { id: role.id, description: body.description, ...(role.isSystem ? {} : { name: body.name }), ...(isSuper ? {} : { permissionKeys: keys }) },
        { onSuccess: () => setSaved(true) },
      );
    }
  };
  const remove = () => {
    if (!role || !window.confirm(t('roles.editor.deleteConfirm', { name: role.name }))) return;
    m.remove.mutate(role.id, { onSuccess: () => onDone(null) });
  };
  const err = m.create.error ?? m.update.error ?? m.remove.error;

  return (
    <section className="card card--pad col gap-16 aside-420" style={{ width: 'auto', flex: '1 1 440px', minWidth: 0 }}>
      <div className="row">
        <h2 className="h2 grow">{role ? role.name : t('roles.editor.new')}</h2>
        {role?.isSystem ? <Tag icon="lock">{t('roles.system')}</Tag> : null}
      </div>
      {saved ? <Banner tone="success">{t('roles.editor.saved')}</Banner> : null}
      {err ? <Banner tone="error">{errorMessage(err, t('common.tryAgainLater'))}</Banner> : null}
      {role?.isSystem ? <Banner tone="info">{isSuper ? t('roles.editor.superNote') : t('roles.editor.systemNote')}</Banner> : null}
      <TextField label={t('roles.editor.name')} value={name} onChange={(e) => setName(e.target.value)} disabled={!canManage || !!role?.isSystem} hint={t('roles.editor.nameHint')} mono />
      <TextField label={t('roles.editor.description')} value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canManage} />
      <div className="col gap-8">
        <div className="row">
          <span className="caps grow">{t('roles.editor.perms')} · {keys.length}</span>
          <SearchInput shortcut={null} style={{ width: 200 }} placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {canManage && !isSuper ? <span className="sub subtle">{t('roles.editor.heldOnly')}</span> : null}
        {groups.map(([module, perms]) => {
          const selectable = perms.filter((p) => editablePerm(p.key));
          const allOn = selectable.length > 0 && selectable.every((p) => selected.has(p.key));
          return (
            <div key={module} className="col" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <label className="row" style={{ padding: '6px 12px', background: 'var(--surface-2)', cursor: selectable.length ? 'pointer' : 'default' }} title={t('roles.editor.selectModule')}>
                <Checkbox
                  disabled={selectable.length === 0}
                  checked={allOn}
                  onChange={(e) => setKeys((cur) => (e.target.checked ? [...new Set([...cur, ...selectable.map((p) => p.key)])] : cur.filter((k) => !selectable.some((p) => p.key === k))))}
                />
                <span className="caps">{t(`mod.${module}` as MessageKey)}</span>
              </label>
              {perms.map((p) => (
                <label key={p.key} className="row" style={{ padding: '6px 12px', borderTop: '1px solid var(--border)', cursor: editablePerm(p.key) ? 'pointer' : 'default', opacity: editablePerm(p.key) || selected.has(p.key) ? 1 : 0.55 }}>
                  <Checkbox disabled={!editablePerm(p.key)} checked={selected.has(p.key)} onChange={(e) => toggleKey(p.key, e.target.checked)} />
                  <span className="col min0">
                    <span className="mono-12">{p.key}</span>
                    <span className="sub ellipsis">{permissionDescription(t, p)}</span>
                  </span>
                </label>
              ))}
            </div>
          );
        })}
      </div>
      {role && (added.length > 0 || removed.length > 0) ? <span className="sub">{t('roles.editor.diff', { added: added.length, removed: removed.length })}</span> : null}
      {role && role.memberCount > 0 && !role.isSystem ? <span className="sub subtle">{t('roles.editor.affected', { n: role.memberCount })}</span> : null}
      {canManage ? (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          {role && !role.isSystem ? <Button variant="danger" icon="trash" onClick={remove} loading={m.remove.isPending} disabled={role.memberCount > 0}>{t('roles.editor.delete')}</Button> : <span />}
          <div className="row">
            <Button variant="ghost" onClick={() => onDone(role?.id ?? null)}>{t('common.cancel')}</Button>
            <Button variant="primary" icon="check" onClick={save} loading={m.create.isPending || m.update.isPending} disabled={!dirty || !name.trim()}>{t('common.save')}</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function RolesView() {
  const { t } = useI18n();
  const { can } = useAuth();
  const roles = useRoles();
  const catalog = usePermissionCatalog();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = roles.data ?? [];
  const selected = selectedId && selectedId !== NEW ? (list.find((r) => r.id === selectedId) ?? null) : null;

  return (
    <div className="page">
      <PageHeader
        title={t('roles.title')}
        subtitle={roles.data ? t('roles.subtitle', { n: list.length }) : undefined}
        actions={can(P.ROLE_MANAGE) ? <Button variant="primary" icon="plus" onClick={() => setSelectedId(NEW)}>{t('roles.new')}</Button> : undefined}
      />
      <AdminTabs />
      {roles.isError || catalog.isError ? (
        <div className="card"><StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} /></div>
      ) : (
        <div className="split" style={{ flexWrap: 'wrap' }}>
          <section className="card card--clip col" style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div className="trow trow--head" style={LIST_COLS}>
              <span>{t('roles.col.name')}</span>
              <span className="right">{t('roles.col.members')}</span>
              <span className="right">{t('roles.col.permissions')}</span>
            </div>
            {roles.isPending ? <div style={{ padding: 16 }}><Skeleton lines={4} height={12} /></div> : null}
            {list.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`trow trow--click${r.id === selectedId ? ' trow--sel' : ''}`}
                style={{ ...LIST_COLS, height: 52, width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid var(--border)', background: 'none', color: 'inherit', font: 'inherit' }}
                onClick={() => setSelectedId(r.id)}
              >
                <span className="col min0">
                  <span className="row gap-6">
                    <span style={{ fontWeight: 500 }}>{r.name}</span>
                    {r.isSystem ? <Icon name="lock" size={12} style={{ color: 'var(--ink-subtle)' }} aria-label={t('roles.system')} /> : null}
                  </span>
                  <span className="sub ellipsis">{r.description}</span>
                </span>
                <span className="mono-12 right">{r.memberCount}</span>
                <span className="mono-12 right">{r.permissionKeys.length}</span>
              </button>
            ))}
          </section>

          {selectedId === NEW || selected ? (
            catalog.data ? (
              <RoleEditor key={selectedId} role={selected} catalog={catalog.data} onDone={(id) => setSelectedId(id)} />
            ) : (
              <section className="card card--pad" style={{ flex: '1 1 440px' }}><Skeleton lines={6} height={12} /></section>
            )
          ) : (
            <section className="card" style={{ flex: '1 1 440px' }}>
              <StateBlock kind="empty" compact title={t('roles.editor.selectPrompt')} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function RolesPage() {
  return (
    <RequirePermission any={[P.ROLE_READ]}>
      <RolesView />
    </RequirePermission>
  );
}
