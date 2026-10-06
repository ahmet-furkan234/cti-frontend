'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { TokenGate } from '@/components/auth/token-page';
import { Banner, Button, PasswordStrength, TextField } from '@/components/ui';
import { useT } from '@/i18n';
import { api, ApiError } from '@/lib/api';

function ResetForm({ email, token }: { email: string; token: string }) {
  const t = useT();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < 12;
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 12 || password !== confirm) return;
    setPending(true);
    setError(null);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password }, noRefresh: true });
      router.replace('/login?reset=1');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.networkError'));
      setPending(false);
    }
  };

  return (
    <form className="flex w-full max-w-[420px] flex-col gap-5 rounded-2xl border border-line bg-surface p-8 shadow-card" onSubmit={submit} noValidate>
      <div>
        <h1 className="text-2xl leading-8 font-semibold tracking-tight">{t('auth.reset.title')}</h1>
        <div className="text-sm text-ink-muted">{t('auth.reset.subtitle', { email })}</div>
      </div>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <TextField
        label={t('auth.newPassword')}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        error={tooShort ? t('auth.passwordTooShort') : undefined}
        required
        autoFocus
      />
      <PasswordStrength password={password} hint={t('auth.passwordHint')} />
      <TextField
        label={t('auth.confirmPassword')}
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        error={mismatch ? t('auth.passwordMismatch') : undefined}
        required
      />
      <Button variant="primary" type="submit" loading={pending} disabled={password.length < 12 || password !== confirm}>
        {t('auth.reset.submit')}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <TokenGate endpoint="reset-tokens">{({ email, token }) => <ResetForm email={email} token={token} />}</TokenGate>
    </Suspense>
  );
}
