'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { errorMessage } from '@/components/admin/admin-parts';
import { useAuth } from '@/components/auth-provider';
import { Banner, Button, TextField, buttonClass } from '@/components/ui';
import { useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { SettingsCard } from './preferences';

const MIN = 12;

export function Security() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [touched, setTouched] = useState(false);
  const change = useMutation({
    mutationFn: () => api('/auth/change-password', { method: 'POST', body: { currentPassword: current, newPassword: next } }),
    onSuccess: () => { setCurrent(''); setNext(''); setAgain(''); setTouched(false); },
  });

  const tooShort = next.length < MIN;
  const mismatch = next !== again;
  const valid = !!current && !tooShort && !mismatch;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (valid) change.mutate();
  };

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <SettingsCard title={t('settings.sec.password')} desc={t('settings.sec.passwordDesc')}>
        <form className="flex max-w-lg flex-col gap-4" onSubmit={submit} noValidate>
          {change.isSuccess ? <Banner tone="success">{t('settings.sec.changed')}</Banner> : null}
          {change.isError ? <Banner tone="error">{errorMessage(change.error, t('common.tryAgainLater'))}</Banner> : null}
          <TextField type="password" autoComplete="current-password" label={t('settings.sec.current')} value={current} onChange={(e) => setCurrent(e.target.value)} />
          <TextField type="password" autoComplete="new-password" label={t('auth.newPassword')} hint={t('auth.passwordHint')} value={next} onChange={(e) => setNext(e.target.value)} error={touched && tooShort ? t('auth.passwordTooShort') : undefined} />
          <TextField type="password" autoComplete="new-password" label={t('auth.confirmPassword')} value={again} onChange={(e) => setAgain(e.target.value)} error={touched && !tooShort && mismatch ? t('auth.passwordMismatch') : undefined} />
          <div><Button variant="primary" type="submit" icon="check" loading={change.isPending}>{t('auth.reset.submit')}</Button></div>
        </form>
      </SettingsCard>
      {user ? (
        <SettingsCard title={t('settings.sec.account')} desc={t('settings.sec.accountDesc')}>
          <Link href={`/admin/users/${user.id}`} className={buttonClass()}>{t('shell.myProfile')}</Link>
        </SettingsCard>
      ) : null}
    </div>
  );
}
