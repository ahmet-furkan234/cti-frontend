'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { errorMessage } from '@/components/admin/admin-parts';
import { ActivityFeed } from '@/components/admin/activity-feed';
import { Avatar } from '@/components/admin/avatar';
import { ProfileTab } from '@/components/admin/user-profile';
import { AccessLegend, AccessSummary } from '@/components/admin/access-editor';
import { useAuth } from '@/components/auth-provider';
import { RequirePermission } from '@/components/shell/page-guard';
import { Banner, Button, Checkbox, Icon, IconButton, MonoText, Select, Skeleton, StateBlock, StatusPill, Tabs, Tag, TextField, buttonClass } from '@/components/ui';
import { usePermissionCatalog, useRoles, useUser, useUserMutations } from '@/features/admin/hooks';
import { useI18n } from '@/i18n';
import { ApiError } from '@/lib/api';
import { formatDate, initials } from '@/lib/format';
import { actionLabel, areaTitle, fullActionLabel, groupByArea, roleLabel } from '@/lib/access';
import { PERMISSIONS as P, SENSITIVE_PERMISSIONS } from '@/lib/permissions';
import { useAge } from '@/lib/use-age';
import type { OverrideEffect, PermissionOverride, UserDetail } from '@/lib/types';

type TabId = 'profile' | 'access' | 'sessions' | 'activity';

function AccessTab({ user }: { user: UserDetail }) {
  const { t } = useI18n();
  const { can, user: me } = useAuth();
  const catalog = usePermissionCatalog();
  const roles = useRoles();
  const m = useUserMutations(user.id);

  const roleKey = user.roles.map((r) => r.id).sort().join(',');
  const [roleIds, setRoleIds] = useState<string[]>(user.roles.map((r) => r.id));
  useEffect(() => setRoleIds(roleKey ? roleKey.split(',') : []), [roleKey]);

  const overrideKey = JSON.stringify(user.overrides);
  const [draft, setDraft] = useState<PermissionOverride[]>(user.overrides);
  useEffect(() => setDraft(JSON.parse(overrideKey) as PermissionOverride[]), [overrideKey]);
  const [pick, setPick] = useState('');
  const [effect, setEffect] = useState<OverrideEffect>('grant');

  const areas = useMemo(() => groupByArea(catalog.data ?? []), [catalog.data]);
  if (catalog.isPending || roles.isPending) return <Skeleton lines={6} height={14} />;
  if (catalog.isError || roles.isError) {
    return <div className="min-w-0 rounded-xl border border-line bg-surface shadow-card"><StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} /></div>;
  }

  const isSelf = me?.id === user.id;
  const canRoles = can(P.USER_UPDATE) && !isSelf;
  const canExceptions = can(P.PERMISSION_ASSIGN) && !isSelf;
  const rolesDirty = roleIds.slice().sort().join(',') !== roleKey;
  const exceptionsDirty = JSON.stringify(draft) !== overrideKey;
  const chosenRoles = roles.data.filter((r) => roleIds.includes(r.id));
  const perms = catalog.data;
  const permOf = (key: string) => perms.find((p) => p.key === key);
  const free = areas.map((a) => ({ ...a, perms: a.perms.filter((p) => !draft.some((o) => o.key === p.key)) })).filter((a) => a.perms.length > 0);
  const newSensitive = draft.find((o) => o.effect === 'grant' && SENSITIVE_PERMISSIONS.includes(o.key) && !user.overrides.some((x) => x.key === o.key && x.effect === 'grant'));

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-2">
      {/* 1 · roles */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('ud.access.rolesTitle')}</h2>
          <p className="text-sm text-ink-muted">{t('ud.access.rolesDesc')}</p>
        </div>
        {m.update.isError ? <Banner tone="error">{errorMessage(m.update.error, t('common.tryAgainLater'))}</Banner> : null}
        {m.update.isSuccess && !rolesDirty ? <Banner tone="success">{t('ud.profile.saved')}</Banner> : null}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {roles.data.map((r) => {
            const on = roleIds.includes(r.id);
            return (
              <label
                key={r.id}
                className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${on ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong'} ${canRoles ? 'cursor-pointer' : ''}`}
              >
                <Checkbox className="mt-1" disabled={!canRoles} checked={on} onChange={(e) => setRoleIds((cur) => (e.target.checked ? [...cur, r.id] : cur.filter((x) => x !== r.id)))} />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{roleLabel(t, r.name)}</span>
                  <span className="text-sm text-ink-muted">{r.description}</span>
                </span>
              </label>
            );
          })}
        </div>
        {canRoles ? (
          <div className="flex items-center justify-end gap-3">
            {roleIds.length === 0 ? <span className="grow text-sm text-critical-ink">{t('ud.roles.needOne')}</span> : null}
            <Button variant="primary" icon="check" disabled={!rolesDirty || roleIds.length === 0} loading={m.update.isPending} onClick={() => m.update.mutate({ roleIds })}>{t('ud.roles.save')}</Button>
          </div>
        ) : null}
      </section>

      {/* 3 · exceptions */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('exc.title')}</h2>
          <p className="text-sm text-ink-muted">{t('exc.desc')}</p>
        </div>
        {m.setOverrides.isSuccess && !exceptionsDirty ? <Banner tone="success">{t('exc.saved')}</Banner> : null}
        {m.setOverrides.isError ? <Banner tone="error">{errorMessage(m.setOverrides.error, t('common.tryAgainLater'))}</Banner> : null}
        {!canExceptions ? <Banner tone="info"><span className="flex items-center gap-1.5"><Icon name="lock" size={14} />{t('perm.readOnly')}</span></Banner> : null}

        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {draft.length === 0 ? <p className="px-5 py-4 text-sm text-ink-muted">{t('exc.empty')}</p> : null}
          {draft.map((o) => {
            const p = permOf(o.key);
            return (
              <div key={o.key} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-b-0">
                <span className="grow font-medium">{p ? fullActionLabel(t, p) : o.key}</span>
                <span className={`inline-flex h-7 items-center gap-1 rounded-full px-3 text-sm font-medium ${o.effect === 'grant' ? 'bg-accent-soft text-accent' : 'bg-critical-soft text-critical-ink'}`}>
                  <Icon name={o.effect === 'grant' ? 'plus' : 'x'} size={13} />
                  {t(o.effect === 'grant' ? 'exc.grant' : 'exc.deny')}
                </span>
                {canExceptions ? (
                  <IconButton aria-label={t('exc.remove')} title={t('exc.remove')} onClick={() => setDraft((d) => d.filter((x) => x.key !== o.key))}>
                    <Icon name="trash" size={16} />
                  </IconButton>
                ) : null}
              </div>
            );
          })}
          {canExceptions && free.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-5 py-3">
              <Select
                className="min-w-[260px] grow md:grow-0"
                aria-label={t('exc.add')}
                placeholder={t('exc.pick')}
                value={pick}
                onChange={setPick}
                options={free.flatMap((a) => a.perms.map((p) => ({ value: p.key, label: actionLabel(t, p), group: areaTitle(t, a.module) })))}
              />
              <div role="radiogroup" aria-label={t('exc.effect')} className="flex rounded-lg border border-line-strong bg-surface p-0.5 text-sm font-medium">
                {(['grant', 'deny'] as const).map((e) => (
                  <button
                    key={e}
                    type="button"
                    role="radio"
                    aria-checked={effect === e}
                    onClick={() => setEffect(e)}
                    className={`h-8 rounded-md px-3 transition-colors ${effect === e ? (e === 'grant' ? 'bg-accent-soft text-accent' : 'bg-critical-soft text-critical-ink') : 'text-ink-muted hover:text-ink'}`}
                  >
                    {t(e === 'grant' ? 'exc.grant' : 'exc.deny')}
                  </button>
                ))}
              </div>
              <Button icon="plus" disabled={!pick} onClick={() => { setDraft((d) => [...d, { key: pick, effect }]); setPick(''); }}>{t('exc.add')}</Button>
            </div>
          ) : null}
        </div>

        {newSensitive ? (
          <Banner tone="warning" title={t('perm.critical.title')}>
            {t('perm.critical.text', { key: permOf(newSensitive.key)?.description ?? newSensitive.key })}
          </Banner>
        ) : null}
        {canExceptions ? (
          <div className="flex items-center justify-end gap-3">
            {exceptionsDirty ? <span className="grow text-sm text-ink-muted">{t('exc.unsaved')}</span> : null}
            <Button variant="ghost" disabled={!exceptionsDirty} onClick={() => setDraft(JSON.parse(overrideKey) as PermissionOverride[])}>{t('common.reset')}</Button>
            <Button variant="primary" icon="check" disabled={!exceptionsDirty} loading={m.setOverrides.isPending} onClick={() => m.setOverrides.mutate(draft)}>{t('exc.save')}</Button>
          </div>
        ) : null}
      </section>
      </div>

      {/* 2 · result */}
      <section className="flex min-w-0 flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('ud.access.effectiveTitle')}</h2>
          <p className="text-sm text-ink-muted">{t('ud.access.effectiveDesc')}</p>
        </div>
        <AccessLegend />
        <AccessSummary areas={areas} roles={chosenRoles} overrides={draft} />
      </section>
    </div>
  );
}

function UserDetailView() {
  const { t } = useI18n();
  const { can, user: me } = useAuth();
  const age = useAge();
  const { id } = useParams<{ id: string }>();
  const { data: user, isPending, error, refetch } = useUser(id);
  const m = useUserMutations(id);
  const [tab, setTab] = useState<TabId>('profile');
  const [flash, setFlash] = useState<string | null>(null);

  if (error instanceof ApiError && (error.status === 404 || error.status === 422)) {
    return (
      <div className="mx-auto flex w-full max-w-[1440px] min-w-0 grow flex-col gap-5 p-4 md:p-8"><div className="min-w-0 rounded-xl border border-line bg-surface shadow-card">
        <StateBlock kind="no-results" code="404" title={t('ud.notFound')} action={<Link href="/admin/users" className={buttonClass()}>{t('ud.backToUsers')}</Link>} />
      </div></div>
    );
  }
  if (error) {
    return <div className="mx-auto flex w-full max-w-[1440px] min-w-0 grow flex-col gap-5 p-4 md:p-8"><div className="min-w-0 rounded-xl border border-line bg-surface shadow-card"><StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={() => void refetch()}>{t('common.retry')}</Button>} /></div></div>;
  }
  if (isPending || !user) return <div className="mx-auto flex w-full max-w-[1440px] min-w-0 grow flex-col p-4 md:p-8 gap-4! md:px-8! md:py-6!"><Skeleton width={280} height={28} /><Skeleton lines={5} height={12} /></div>;

  const isSelf = me?.id === user.id;
  const disabled = user.status === 'disabled';
  const tabs = [
    { id: 'profile', label: t('ud.tab.profile') },
    { id: 'access', label: t('ud.tab.access') },
    { id: 'sessions', label: t('ud.tab.sessions') },
    { id: 'activity', label: t('ud.tab.activity') },
  ];

  const toggleStatus = () => {
    if (!disabled && !window.confirm(t('ud.disableConfirm', { name: user.name }))) return;
    m.update.mutate({ status: disabled ? 'active' : 'disabled' });
  };
  const revoke = () =>
    m.revokeSessions.mutate(undefined, { onSuccess: () => setFlash(t('ud.revoked')) });

  return (
    <div className="mx-auto flex w-full max-w-[1440px] min-w-0 grow flex-col p-4 md:p-8 gap-4! md:px-8! md:py-6!">
      <nav className="text-sm text-ink-muted [&_a]:text-ink-muted [&_a:hover]:text-ink" aria-label="breadcrumb">
        <Link href="/admin/users">{t('ud.breadcrumb.users')}</Link> / {user.name}
      </nav>
      <div className="flex items-center gap-3.5 flex-wrap">
        <Avatar user={user} size={48} />
        <div className="flex flex-col grow min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl leading-8 font-semibold tracking-tight">{user.name}</h1>
            <StatusPill status={user.status} />
          </div>
          <div className="flex items-center gap-2 flex-wrap text-ink-muted text-[13px]">
            <span className="font-mono">{user.email}</span>·
            {user.roles.map((r) => <Tag key={r.id}>{roleLabel(t, r.name)}</Tag>)}·
            <span>{user.lastLoginAt ? t('ud.lastLogin', { age: age(user.lastLoginAt) }) : t('ud.neverSignedIn')}</span>
          </div>
        </div>
        {can(P.USER_UPDATE) && !isSelf ? (
          <>
            <Button onClick={revoke} loading={m.revokeSessions.isPending}>{t('ud.revokeSessions')}</Button>
            <Button variant={disabled ? 'secondary' : 'danger'} onClick={toggleStatus} loading={m.update.isPending}>{disabled ? t('ud.enable') : t('ud.disable')}</Button>
          </>
        ) : null}
      </div>
      {flash ? <Banner tone="success" onDismiss={() => setFlash(null)}>{flash}</Banner> : null}
      {m.revokeSessions.isError ? <Banner tone="error">{errorMessage(m.revokeSessions.error, t('common.tryAgainLater'))}</Banner> : null}
      {m.update.isError && tab === 'profile' ? null : m.update.isError ? <Banner tone="error">{errorMessage(m.update.error, t('common.tryAgainLater'))}</Banner> : null}

      <Tabs label={t('ud.tabs.label')} items={tabs} value={tab} onChange={(v) => setTab(v as TabId)} />
      {tab === 'profile' ? <ProfileTab user={user} isSelf={isSelf} onOpenAccess={() => setTab('access')} /> : null}
      {tab === 'access' ? <AccessTab user={user} /> : null}
      {tab === 'sessions' ? (
        <div className="min-w-0 rounded-xl border border-line bg-surface shadow-card">
          <StateBlock kind="empty" title={t('ud.sessions.title')} description={t('ud.sessions.desc')} action={can(P.USER_UPDATE) && !isSelf ? <Button onClick={revoke} loading={m.revokeSessions.isPending}>{t('ud.revokeSessions')}</Button> : undefined} />
        </div>
      ) : null}
      {tab === 'activity' ? <ActivityFeed userId={user.id} /> : null}
    </div>
  );
}

export default function UserDetailPage() {
  const { user: me } = useAuth();
  const { id } = useParams<{ id: string }>();
  return (
    <RequirePermission any={me?.id === id ? [] : [P.USER_READ]}>
      <UserDetailView />
    </RequirePermission>
  );
}
