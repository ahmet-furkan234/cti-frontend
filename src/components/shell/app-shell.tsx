'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { isLocalSession } from '@/lib/local-auth';
import { Banner, Button, Skeleton } from '@/components/ui';
import { useT } from '@/i18n';
import type { Theme } from '@/lib/theme';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

function currentTheme(): Theme {
  return typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function AppShell({ children }: { children: ReactNode }) {
  const { status, user, switchCompany } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => setTheme(currentTheme()), []);
  useEffect(() => setNavOpen(false), [pathname]);
  useEffect(() => {
    if (status === 'anon') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  if (status !== 'authed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas" role="status" aria-label={t('shell.sessionChecking')}>
        <Skeleton width={220} height={14} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {navOpen ? <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setNavOpen(false)} role="presentation" /> : null}
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      <div className="flex min-w-0 grow flex-col">
        <Topbar onToggleNav={() => setNavOpen((v) => !v)} theme={theme} onThemeChange={setTheme} />
        <main className="flex min-w-0 grow flex-col">
          {isLocalSession() ? <Banner tone="info" className="mx-4 mt-4 md:mx-8">{t('shell.localPreview')}</Banner> : null}
          {user?.actingCompany && user.company && user.actingCompany.id !== user.company.id ? (
            <Banner tone="warning" className="mx-4 mt-4 md:mx-8" action={<Button size="sm" onClick={() => switchCompany(null)}>{t('companies.back')}</Button>}>
              {t('companies.acting', { name: user.actingCompany.name })}
            </Banner>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
