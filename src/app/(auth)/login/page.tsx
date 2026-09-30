'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Banner, Button, TextField } from '@/components/ui';
import { useT } from '@/i18n';
import { ApiError } from '@/lib/api';
import { formatTime } from '@/lib/format';
import { canSkipLogin } from '@/lib/local-auth';
import { safeNext } from '@/lib/safe-redirect';

function LoginForm() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const { status, login, skipLogin } = useAuth();
  const [localSkip, setLocalSkip] = useState(false);
  useEffect(() => setLocalSkip(canSkipLogin()), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

  const next = safeNext(params.get('next'));
  useEffect(() => {
    if (status === 'authed') router.replace(next);
  }, [status, router, next]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(email, password);
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 423) setLockedUntil(String(err.body?.['lockedUntil'] ?? ''));
        else if (err.code === 'USER_INACTIVE') setError(t('auth.inactive'));
        else if (err.status === 429) setError(t('auth.tooMany'));
        else if (err.status === 401) setError(t('auth.badCredentials'));
        else setError(err.message);
      } else {
        setError(t('auth.networkError'));
      }
      setPending(false);
    }
  };

  const locked = lockedUntil !== null;
  return (
    <form className="auth-card" onSubmit={submit} noValidate>
      <div>
        <h1 className="h1">{t('auth.login.title')}</h1>
        <div className="sub">{t('auth.login.subtitle')}</div>
      </div>
      {params.get('reset') ? <Banner tone="success">{t('auth.resetDone')}</Banner> : null}
      {locked ? (
        <Banner tone="error" title={t('auth.locked.title')}>
          {t('auth.locked.text', { time: formatTime(lockedUntil) })}
        </Banner>
      ) : null}
      <TextField label={t('auth.email')} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} disabled={locked} required autoFocus />
      <TextField
        label={t('auth.password')}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={locked}
        error={error ?? undefined}
        required
      />
      <Button variant="primary" type="submit" loading={pending} disabled={locked || !email || !password}>
        {pending ? t('auth.signingIn') : t('auth.continue')}
      </Button>
      {localSkip ? <Button type="button" onClick={skipLogin} disabled={pending}>{t('auth.localSkip')}</Button> : null}
      <div className="sub subtle" style={{ textAlign: 'center' }}>
        {t('auth.forgot')}
        <br />
        {t('auth.noAccount')}
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
