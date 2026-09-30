'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { isLocalSession } from '@/lib/local-auth';
import { Banner, Skeleton } from '@/components/ui';
import { useT } from '@/i18n';
import type { Theme } from '@/lib/theme';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

function currentTheme(): Theme {
  return typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function AppShell({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => setTheme(currentTheme()), []);
  useEffect(() => setNavOpen(false), [pathname]);
  useEffect(() => {
    if (status === 'anon') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  if (status !== 'authed') {
    return (
      <div className="auth-bg" role="status" aria-label={t('shell.sessionChecking')}>
        <Skeleton width={220} height={14} />
      </div>
    );
  }

  return (
    <div className="shell">
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      <div className="main-col">
        <Topbar onToggleNav={() => setNavOpen((v) => !v)} theme={theme} onThemeChange={setTheme} />
        <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
          {isLocalSession() ? <Banner tone="info">{t('shell.localPreview')}</Banner> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
