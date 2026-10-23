'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { TokenGate } from '@/components/auth/token-page';
import { useAuth } from '@/components/auth-provider';
import { Banner, Button, Icon, PasswordStrength, TextField } from '@/components/ui';
import { useT } from '@/i18n';
import { api, ApiError } from '@/lib/api';
import type { LoginResponse } from '@/lib/types';

function RegisterForm({ email, token }: { email: string; token: string }) {
  const t = useT();
  const router = useRouter();
  const { applySession } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < 12;
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending || !name.trim() || password.length < 12 || password !== confirm) return;
    setPending(true);
    setError(null);
    try {
      const res = await api<LoginResponse>('/auth/register', { method: 'POST', body: { token, name, password }, noRefresh: true });
      applySession(res.accessToken, res.user);
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? (err.status === 409 ? t('auth.register.exists') : err.message) : t('auth.networkError'));
      setPending(false);
    }
  };

  return (
    <form className="flex w-full max-w-[420px] flex-col gap-4 rounded-2xl border border-line bg-surface p-6 shadow-card" onSubmit={submit} noValidate>
      <div>
        <h1 className="text-2xl leading-8 font-semibold tracking-tight">{t('auth.register.title')}</h1>
        <div className="text-sm text-ink-muted">{t('auth.register.subtitle', { email })}</div>
      </div>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <TextField label={t('auth.name')} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required autoFocus />
      <TextField
        label={t('auth.newPassword')}
        type={showPassword ? 'text' : 'password'}
        endAdornment={<button type="button" className="inline-flex size-8 items-center justify-center text-ink-muted" aria-label={t(showPassword ? 'register.passwordHide' : 'register.passwordShow')} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}><Icon name={showPassword ? 'eye-off' : 'eye'} size={18} /></button>}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        error={tooShort ? t('auth.passwordTooShort') : undefined}
        required
      />
      <PasswordStrength password={password} hint={t('auth.passwordHint')} />
      <TextField
        label={t('auth.confirmPassword')}
        type={showConfirm ? 'text' : 'password'}
        endAdornment={<button type="button" className="inline-flex size-8 items-center justify-center text-ink-muted" aria-label={t(showConfirm ? 'register.passwordHide' : 'register.passwordShow')} aria-pressed={showConfirm} onClick={() => setShowConfirm((v) => !v)}><Icon name={showConfirm ? 'eye-off' : 'eye'} size={18} /></button>}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        error={mismatch ? t('auth.passwordMismatch') : undefined}
        required
      />
      <Button variant="primary" type="submit" loading={pending} disabled={!name.trim() || password.length < 12 || password !== confirm}>
        {t('auth.register.submit')}
      </Button>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <TokenGate endpoint="invitations">{({ email, token }) => <RegisterForm email={email} token={token} />}</TokenGate>
    </Suspense>
  );
}
