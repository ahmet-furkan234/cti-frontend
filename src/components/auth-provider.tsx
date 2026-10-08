'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, hasSessionHint, refreshSession, setAccessToken, setSessionLostHandler } from '@/lib/api';
import { setActingCompany } from '@/lib/active-company';
import type { LoginResponse, Me } from '@/lib/types';

import { canSkipLogin, isLocalSession, setLocalSession } from '@/lib/local-auth';
import { PERMISSIONS } from '@/lib/permissions';

const localUser: Me = { id: 'local-preview', email: 'local@localhost', name: 'Local Preview', roles: [{ id: 'local', name: 'Local Preview' }], permissions: Object.values(PERMISSIONS), lastLoginAt: null };

type Status = 'loading' | 'authed' | 'anon';

interface AuthValue {
  status: Status;
  user: Me | null;
  can: (...permissions: string[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  skipLogin: () => void;
  logout: () => Promise<void>;
  applySession: (accessToken: string, user: Me) => void;
  reloadUser: () => Promise<void>;
  /** Works inside another company (platform users) or back in one's own (null). Reloads the app so nothing stale stays on screen. */
  switchCompany: (companyId: string | null) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<Me | null>(null);

  const applySession = useCallback((token: string, me: Me) => {
    setLocalSession(false);
    setAccessToken(token);
    // Working inside another company is for platform managers only; a different person signing in starts in their own.
    if (!me.permissions.includes(PERMISSIONS.COMPANY_MANAGE)) setActingCompany(null);
    setUser(me);
    setStatus('authed');
  }, []);

  const clear = useCallback(() => {
    setLocalSession(false);
    setAccessToken(null);
    setActingCompany(null);
    setUser(null);
    setStatus('anon');
    queryClient.clear();
  }, [queryClient]);

  // Restore the session from the refresh cookie on first load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isLocalSession()) {
        setUser(localUser);
        setStatus('authed');
        return;
      }
      // Never signed in on this browser: skip the (401-producing) refresh call.
      if (!hasSessionHint()) return setStatus('anon');
      const token = await refreshSession();
      if (cancelled) return;
      if (!token) return setStatus('anon');
      try {
        const me = await api<Me>('/auth/me');
        if (!cancelled) applySession(token, me);
      } catch {
        if (!cancelled) clear();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySession, clear]);

  // If a request finds the session dead (refresh failed), drop to the login screen.
  useEffect(() => {
    setSessionLostHandler(clear);
    return () => setSessionLostHandler(null);
  }, [clear]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api<LoginResponse>('/auth/login', { method: 'POST', body: { email, password }, noRefresh: true });
      applySession(res.accessToken, res.user);
    },
    [applySession],
  );

  const skipLogin = useCallback(() => {
    if (!canSkipLogin()) return;
    setAccessToken(null);
    queryClient.clear();
    setLocalSession(true);
    setUser(localUser);
    setStatus('authed');
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      if (isLocalSession()) return;
      await api('/auth/logout', { method: 'POST', noRefresh: true });
    } finally {
      clear();
    }
  }, [clear]);

  const reloadUser = useCallback(async () => {
    if (isLocalSession()) return;
    setUser(await api<Me>('/auth/me'));
  }, []);

  const switchCompany = useCallback((companyId: string | null) => {
    setActingCompany(companyId);
    window.location.assign('/');
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      applySession,
      login,
      skipLogin,
      logout,
      reloadUser,
      switchCompany,
      can: (...permissions) => !!user && permissions.some((p) => user.permissions.includes(p)),
    }),
    [status, user, applySession, login, skipLogin, logout, reloadUser, switchCompany],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
