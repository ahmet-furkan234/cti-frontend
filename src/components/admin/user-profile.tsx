'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Avatar } from '@/components/admin/avatar';
import { errorMessage } from '@/components/admin/admin-parts';
import { useAuth } from '@/components/auth-provider';
import { Banner, Button, Icon, MonoText, StatusPill, Tag, TextField } from '@/components/ui';
import { useUserMutations } from '@/features/admin/hooks';
import { useI18n } from '@/i18n';
import { roleLabel } from '@/lib/access';
import { formatDate } from '@/lib/format';
import { PERMISSIONS as P } from '@/lib/permissions';
import { useAge } from '@/lib/use-age';
import type { UserDetail } from '@/lib/types';

const NAME_MAX = 80;

function Card({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-5 rounded-xl border border-line bg-surface p-6 shadow-card">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {desc ? <p className="text-[15px] text-ink-muted">{desc}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0">
      <dt className="shrink-0 text-[15px] text-ink-muted">{label}</dt>
      <dd className="m-0 flex min-w-0 flex-wrap justify-end gap-1.5 text-right text-[15px]">{children}</dd>
    </div>
  );
}

/** Name is the only editable detail; the e-mail address is the sign-in identity and stays read-only. */
function PersonalCard({ user, isSelf }: { user: UserDetail; isSelf: boolean }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const m = useUserMutations(user.id);
  const [name, setName] = useState(user.name);
  const [touched, setTouched] = useState(false);
  useEffect(() => setName(user.name), [user.name]);

  const editable = can(P.USER_UPDATE);
  const trimmed = name.trim();
  const dirty = trimmed !== user.name;
  const error = touched && !trimmed ? t('ud.profile.nameRequired') : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (trimmed && dirty) m.update.mutate({ name: trimmed });
  };

  return (
    <Card title={t('ud.profile.personal')} desc={t('ud.profile.personalDesc')}>
      <div className="flex items-center gap-4">
        <Avatar user={{ id: user.id, name: trimmed || user.name }} size={64} />
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold">{trimmed || user.name}</div>
          <div className="truncate text-sm text-ink-muted">{user.email}</div>
          {isSelf ? <Tag tone="accent" className="mt-1.5">{t('ud.profile.you')}</Tag> : null}
        </div>
      </div>

      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        {m.update.isSuccess && !dirty ? <Banner tone="success">{t('ud.profile.saved')}</Banner> : null}
        {m.update.isError ? <Banner tone="error">{errorMessage(m.update.error, t('common.tryAgainLater'))}</Banner> : null}
        <TextField
          label={t('ud.profile.name')}
          value={name}
          maxLength={NAME_MAX}
          error={error}
          disabled={!editable}
          onChange={(e) => { setName(e.target.value); setTouched(true); }}
          autoComplete="off"
        />
        <TextField label={t('ud.profile.email')} hint={t('ud.profile.emailNote')} value={user.email} readOnly disabled mono />
        {editable ? (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" type="button" disabled={!dirty} onClick={() => { setName(user.name); setTouched(false); }}>{t('common.reset')}</Button>
            <Button variant="primary" type="submit" icon="check" disabled={!dirty || !trimmed} loading={m.update.isPending}>{t('common.save')}</Button>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-ink-muted"><Icon name="lock" size={14} />{t('ud.profile.readOnly')}</p>
        )}
      </form>
    </Card>
  );
}

function SummaryCard({ user, onOpenAccess }: { user: UserDetail; onOpenAccess: () => void }) {
  const { t } = useI18n();
  const age = useAge();
  return (
    <Card title={t('ud.profile.account')}>
      <dl className="m-0 flex flex-col">
        <Fact label={t('ud.profile.status')}><StatusPill status={user.status} /></Fact>
        <Fact label={t('ud.profile.roles')}>
          {user.roles.length ? user.roles.map((r) => <Tag key={r.id}>{roleLabel(t, r.name)}</Tag>) : <span className="text-ink-subtle">{t('users.noRoles')}</span>}
        </Fact>
        <Fact label={t('ud.profile.lastLogin')}>{user.lastLoginAt ? age(user.lastLoginAt) : t('ud.neverSignedIn')}</Fact>
        <Fact label={t('ud.profile.created')}><span className="tabular-nums">{formatDate(user.createdAt)}</span></Fact>
        <Fact label={t('ud.profile.id')}><MonoText copy truncate>{user.id}</MonoText></Fact>
      </dl>
      <Button icon="shield" onClick={onOpenAccess}>{t('ud.profile.manageAccess')}</Button>
    </Card>
  );
}

function PasswordCard({ userId }: { userId: string }) {
  const { t } = useI18n();
  const r = useUserMutations(userId).issueReset;
  return (
    <Card title={t('ud.reset.title')} desc={t('ud.reset.desc')}>
      {r.isError ? <Banner tone="error">{errorMessage(r.error, t('common.tryAgainLater'))}</Banner> : null}
      {r.data ? (
        <Banner tone="success" title={t('ud.reset.ready')}>
          <span>{t('ud.reset.valid', { date: formatDate(r.data.expiresAt) })}</span>
          <div className="mt-1.5"><MonoText copy truncate>{r.data.resetUrl}</MonoText></div>
        </Banner>
      ) : null}
      <div><Button icon="key" loading={r.isPending} onClick={() => r.mutate()}>{r.data ? t('ud.reset.again') : t('ud.reset.button')}</Button></div>
    </Card>
  );
}

export function ProfileTab({ user, isSelf, onOpenAccess }: { user: UserDetail; isSelf: boolean; onOpenAccess: () => void }) {
  const { can } = useAuth();
  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-4">
        <PersonalCard user={user} isSelf={isSelf} />
        {can(P.USER_RESET_PASSWORD) ? <PasswordCard userId={user.id} /> : null}
      </div>
      <SummaryCard user={user} onOpenAccess={onOpenAccess} />
    </div>
  );
}
