'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { AdminHeader, Drawer, errorMessage } from '@/components/admin/admin-parts';
import { AccessEditor } from '@/components/admin/access-editor';
import { Avatar } from '@/components/admin/avatar';
import { useAuth } from '@/components/auth-provider';
import { RequirePermission } from '@/components/shell/page-guard';
import { Banner, Button, Icon, SearchInput, Skeleton, StateBlock, StatusPill, Tag, TextField, cx } from '@/components/ui';
import { useCreateUser, usePermissionCatalog, useRoles, useUsers } from '@/features/admin/hooks';
import { useI18n } from '@/i18n';
import { groupByArea, roleLabel } from '@/lib/access';
import { ApiError } from '@/lib/api';
import { PERMISSIONS as P } from '@/lib/permissions';
import { isStrongPassword, passwordRequirements } from '@/lib/password-policy';
import { useAge } from '@/lib/use-age';
import type { PermissionOverride, Role, UserListItem } from '@/lib/types';

const PAGE_SIZE = 20;
const ROW_GRID = 'md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_130px_110px_20px]';
/* ---------- direct registration ---------- */
function RegisterDrawer({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { can, user: actor } = useAuth();
  const roles = useRoles();
  const catalog = usePermissionCatalog(can(P.ROLE_READ, P.PERMISSION_ASSIGN));
  const create = useCreateUser();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [customKeys, setCustomKeys] = useState<string[]>([]);

  const areas = useMemo(() => groupByArea(catalog.data ?? []), [catalog.data]);
  const assignableRoles = useMemo(() => {
    const held = new Set(actor?.permissions ?? []);
    return (roles.data ?? []).filter((r) => r.permissionKeys.every((key) => held.has(key)));
  }, [actor?.permissions, roles.data]);
  const roleKeys = useMemo(() => [...new Set(assignableRoles.filter((r) => roleIds.includes(r.id)).flatMap((r) => r.permissionKeys))], [assignableRoles, roleIds]);
  const canCustomize = can(P.PERMISSION_ASSIGN);
  const unmetPasswordRequirements = passwordRequirements(password).filter((requirement) => !requirement.met);
  const passwordValid = isStrongPassword(password) && password === confirmation;
  const overrides = useMemo<PermissionOverride[]>(() => {
    const base = new Set(roleKeys);
    const desired = new Set(customKeys);
    return (catalog.data ?? []).flatMap((permission) => {
      if (base.has(permission.key) === desired.has(permission.key)) return [];
      return [{ key: permission.key, effect: desired.has(permission.key) ? 'grant' as const : 'deny' as const }];
    });
  }, [catalog.data, customKeys, roleKeys]);

  const next = () => {
    if (step === 1 && name.trim() && email && passwordValid) setStep(2);
    else if (step === 2 && roleIds.length > 0) {
      setCustomKeys(roleKeys);
      setStep(3);
    }
  };
  const submit = () => create.mutate({ name: name.trim(), email, password, roleIds, overrides: canCustomize ? overrides : [] });
  const reset = () => {
    create.reset(); setStep(1); setName(''); setEmail(''); setPassword(''); setConfirmation(''); setShowPassword(false); setShowConfirmation(false); setRoleIds([]); setCustomKeys([]);
  };
  const result = create.data;
  const errorText = create.error
    ? create.error instanceof ApiError && create.error.status === 409
      ? t('register.exists')
      : errorMessage(create.error, t('common.tryAgainLater'))
    : null;

  return (
    <Drawer
      title={t('register.title')}
      onClose={onClose}
      wide={step === 3}
      centered
      footer={result ? undefined : (
        <>
          {step > 1 ? <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>{t('common.back')}</Button> : <span className="grow" />}
          {step < 3 ? <Button variant="primary" onClick={next} disabled={step === 1 ? !name.trim() || !email || !passwordValid : roleIds.length === 0}>{t('common.next')}</Button> : (
            <Button variant="primary" icon="check" loading={create.isPending} onClick={submit}>{t('register.submit')}</Button>
          )}
        </>
      )}
    >
      {result ? (
        <>
          <Banner tone="success" title={t('register.created')}>{t('register.createdText', { email: result.email })}</Banner>
          <Button variant="ghost" onClick={reset}>{t('register.another')}</Button>
        </>
      ) : (
        <div className="flex min-h-0 grow flex-col gap-5">
          <div className="flex items-center gap-2" aria-label={t('register.progress')}>
            {[1, 2, 3].map((n) => <span key={n} className={cx('h-1.5 grow rounded-full', n <= step ? 'bg-accent' : 'bg-surface-2')} />)}
            <span className="ml-2 text-sm text-ink-muted">{t('register.step', { step })}</span>
          </div>
          {errorText ? <Banner tone="error">{errorText}</Banner> : null}
          {step === 1 ? (
            <form className="flex flex-col gap-4" onSubmit={(e: FormEvent) => { e.preventDefault(); next(); }}>
              <p className="text-[15px] text-ink-muted">{t('register.accountDesc')}</p>
              <TextField label={t('register.name')} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              <TextField label={t('register.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <TextField
                label={t('register.password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint={t('register.passwordHint')}
                endAdornment={<button type="button" className="inline-flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-accent-soft hover:text-accent" aria-label={showPassword ? t('register.passwordHide') : t('register.passwordShow')} aria-pressed={showPassword} onClick={() => setShowPassword((shown) => !shown)}><Icon name={showPassword ? 'eye-off' : 'eye'} size={18} /></button>}
                required
              />
              {password && unmetPasswordRequirements.length > 0 ? (
                <div className="-mt-2 rounded-lg border border-critical/30 bg-critical-soft px-3 py-2" aria-live="polite">
                  <p className="mb-1 text-sm font-medium text-critical-ink">{t('register.passwordMissing')}</p>
                  <ul className="m-0 grid list-none gap-1 p-0 text-sm text-critical-ink sm:grid-cols-2">
                    {unmetPasswordRequirements.map((requirement) => (
                      <li key={requirement.key} className="flex items-center gap-1.5"><Icon name="x" size={13} />{t(`register.passwordRule.${requirement.key}` as 'register.passwordRule.length')}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <TextField
                label={t('register.passwordAgain')}
                type={showConfirmation ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                error={confirmation && password !== confirmation ? t('register.passwordMismatch') : undefined}
                endAdornment={<button type="button" className="inline-flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-accent-soft hover:text-accent" aria-label={showConfirmation ? t('register.passwordHide') : t('register.passwordShow')} aria-pressed={showConfirmation} onClick={() => setShowConfirmation((shown) => !shown)}><Icon name={showConfirmation ? 'eye-off' : 'eye'} size={18} /></button>}
                required
              />
            </form>
          ) : null}
          {step === 2 ? (
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-1 text-base font-semibold">{t('register.roles')}</legend>
              <p className="mb-3 text-sm text-ink-muted">{t('register.rolesHint')}</p>
              {roles.isPending ? <Skeleton lines={3} height={14} /> : null}
              {assignableRoles.map((r) => {
                const on = roleIds.includes(r.id);
                return <label key={r.id} className={cx('flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors', on ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong')}>
                  <input type="checkbox" className="mt-1 size-4 accent-accent" checked={on} onChange={(e) => setRoleIds((cur) => e.target.checked ? [...cur, r.id] : cur.filter((x) => x !== r.id))} />
                  <span className="flex flex-col"><span className="font-medium">{roleLabel(t, r.name)}</span><span className="text-sm text-ink-muted">{r.description}</span></span>
                </label>;
              })}
            </fieldset>
          ) : null}
          {step === 3 ? (
            <div className="flex flex-col gap-4">
              <div><h3 className="font-semibold">{t('register.custom')}</h3><p className="text-sm text-ink-muted">{canCustomize ? t('register.customHint') : t('register.customLocked')}</p></div>
              {catalog.isPending ? <Skeleton lines={5} height={14} /> : <AccessEditor areas={areas} keys={customKeys} onChange={setCustomKeys} canChange={(key) => canCustomize && !!actor?.permissions.includes(key)} />}
              {overrides.length > 0 ? <Banner tone="info">{t('register.customCount', { count: overrides.length })}</Banner> : null}
            </div>
          ) : null}
        </div>
      )}
    </Drawer>
  );
}

/* ---------- list ---------- */
type Status = '' | 'active' | 'disabled';

function StatTile({ label, value, active, onClick, tone }: { label: string; value: number | undefined; active: boolean; onClick: () => void; tone?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx('flex flex-col gap-0.5 rounded-xl border bg-surface px-3 py-3 text-left shadow-card transition-colors sm:px-5 sm:py-4', active ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong')}
    >
      <span className="text-sm text-ink-muted">{label}</span>
      <span className={cx('text-2xl font-semibold tabular-nums sm:text-3xl sm:leading-9', tone)}>{value ?? '—'}</span>
    </button>
  );
}

function RoleChip({ label, count, on, onClick }: { label: string; count?: number; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx('inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors', on ? 'border-transparent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink-muted hover:text-ink')}
    >
      {label}
      {count != null ? <span className={cx('text-xs tabular-nums', on ? 'opacity-80' : 'text-ink-subtle')}>{count}</span> : null}
    </button>
  );
}

function UsersList() {
  const { t } = useI18n();
  const { can, user: me } = useAuth();
  const age = useAge();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status>('');
  const [roleId, setRoleId] = useState('');
  const [page, setPage] = useState(1);
  const [registering, setRegistering] = useState(false);

  const filters = { ...(q.trim() ? { q: q.trim() } : {}), ...(roleId ? { roleId } : {}) };
  const users = useUsers({ page, pageSize: PAGE_SIZE, ...filters, ...(status ? { status } : {}) });
  // Counts for the status tiles follow the search and role filters but ignore the status itself.
  const active = useUsers({ page: 1, pageSize: 1, ...filters, status: 'active' });
  const disabled = useUsers({ page: 1, pageSize: 1, ...filters, status: 'disabled' });
  const roles = useRoles(can(P.ROLE_READ, P.USER_READ));
  const total = users.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = !!(q.trim() || status || roleId);
  const reset = () => { setQ(''); setStatus(''); setRoleId(''); setPage(1); };
  const pick = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
  const allCount = (active.data?.total ?? 0) + (disabled.data?.total ?? 0);

  return (
    <div className="mx-auto flex w-full max-w-[1100px] min-w-0 grow flex-col gap-5 p-4 md:p-8">
      <AdminHeader actions={can(P.USER_CREATE) ? <Button variant="primary" icon="plus" onClick={() => setRegistering(true)}>{t('users.register')}</Button> : undefined} />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile label={t('users.stat.total')} value={users.isPending ? undefined : allCount} active={status === ''} onClick={() => pick(setStatus)('')} />
        <StatTile label={t('users.stat.active')} value={active.data?.total} active={status === 'active'} onClick={() => pick(setStatus)('active')} tone="text-low-ink" />
        <StatTile label={t('users.stat.disabled')} value={disabled.data?.total} active={status === 'disabled'} onClick={() => pick(setStatus)('disabled')} tone="text-ink-muted" />
      </div>

      <div className="flex flex-col gap-3">
        <SearchInput shortcut={null} className="w-full md:max-w-md" placeholder={t('users.searchPlaceholder')} value={q} onChange={(e) => pick(setQ)(e.target.value)} />
        {roles.data ? (
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t('users.rolesFilter')}>
            <RoleChip label={t('users.f.allRoles')} on={roleId === ''} onClick={() => pick(setRoleId)('')} />
            {roles.data.map((r: Role) => (
              <RoleChip key={r.id} label={roleLabel(t, r.name)} count={r.memberCount} on={roleId === r.id} onClick={() => pick(setRoleId)(roleId === r.id ? '' : r.id)} />
            ))}
          </div>
        ) : null}
      </div>

      {users.isError ? (
        <div className="min-w-0 rounded-xl border border-line bg-surface shadow-card">
          <StateBlock kind="error" title={t('common.loadError')} description={t('common.tryAgainLater')} action={<Button onClick={() => void users.refetch()}>{t('common.retry')}</Button>} />
        </div>
      ) : (
        <>
          <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-card" aria-busy={users.isPending}>
            {users.isPending
              ? Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-line px-5 py-4 last:border-b-0">
                    <Skeleton circle width={40} height={40} />
                    <Skeleton lines={2} height={10} />
                  </div>
                ))
              : null}
            {users.data && users.data.items.length === 0 ? (
              <StateBlock
                kind="no-results"
                compact
                title={t('users.empty')}
                description={t('users.emptyHint')}
                action={filtered ? <Button size="sm" onClick={reset}>{t('users.clearFilters')}</Button> : undefined}
              />
            ) : null}
            {users.data?.items.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className={cx('group grid grid-cols-1 items-center gap-x-4 gap-y-2 border-b border-line px-5 py-4 text-ink no-underline last:border-b-0 hover:bg-surface-2 hover:text-ink', ROW_GRID)}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar user={u} />
                  <span className="flex min-w-0 flex-col">
                    <span className={cx('truncate font-medium', u.status === 'disabled' && 'text-ink-muted')}>
                      {u.name}
                      {u.id === me?.id ? <span className="font-normal text-ink-subtle"> · {t('users.you')}</span> : null}
                    </span>
                    <span className="truncate text-sm text-ink-muted">{u.email}</span>
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {u.roles.length ? u.roles.map((r) => <Tag key={r.id}>{roleLabel(t, r.name)}</Tag>) : <span className="text-sm text-ink-subtle">{t('users.noRoles')}</span>}
                </span>
                <span><StatusPill status={u.status} /></span>
                <span className="text-sm text-ink-muted">{u.lastLoginAt ? age(u.lastLoginAt) : t('common.never')}</span>
                <Icon name="down" size={16} className="hidden -rotate-90 text-ink-subtle group-hover:text-ink md:block" />
              </Link>
            ))}
          </section>
          {total > PAGE_SIZE ? (
            <div className="flex items-center gap-3 text-sm text-ink-muted">
              <span className="grow">{t('users.page', { page, pages, total })}</span>
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('common.previous')}</Button>
              <Button size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>{t('common.next')}</Button>
            </div>
          ) : null}
        </>
      )}
      {registering ? <RegisterDrawer onClose={() => setRegistering(false)} /> : null}
    </div>
  );
}

export default function UsersPage() {
  return (
    <RequirePermission any={[P.USER_READ]}>
      <UsersList />
    </RequirePermission>
  );
}
