'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button, Icon, IconButton, SearchInput, StatusPill } from '@/components/ui';
import { LangSwitch } from './lang-switch';
import { CompanySwitcher } from './company-switcher';
import { useAuth } from '@/components/auth-provider';
import { useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { applyTheme, type Theme } from '@/lib/theme';
import { PERMISSIONS as P } from '@/lib/permissions';
import { overallHealth } from '@/lib/sync-health';
import type { SyncState } from '@/lib/types';

function HealthPill() {
  const { t } = useI18n();
  const { data } = useQuery({ queryKey: ['sync'], queryFn: () => api<SyncState[]>('/sync'), refetchInterval: 60_000 });
  if (!data) return null;
  const h = overallHealth(data);
  return <StatusPill status={h} label={t(h === 'healthy' ? 'shell.health.ok' : h === 'degraded' ? 'shell.health.warn' : 'shell.health.fail')} />;
}

export function Topbar({ onToggleNav, theme, onThemeChange }: { onToggleNav: () => void; theme: Theme; onThemeChange: (t: Theme) => void }) {
  const { t } = useI18n();
  const { can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term) router.push(`/cves?q=${encodeURIComponent(term)}`);
  };
  const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
  const themeLabel = t(theme === 'dark' ? 'shell.theme.toLight' : 'shell.theme.toDark');

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur md:px-8">
      <Button variant="ghost" className="lg:hidden" onClick={onToggleNav} aria-label={t('shell.menu')} icon="menu" />
      {can(P.CVE_READ) ? (
        <form onSubmit={submit} className="min-w-0 flex-1 md:max-w-md md:flex-none md:basis-md">
          <SearchInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('shell.searchPlaceholder')}
            // The CVE Explorer has its own big search box that owns the "/" shortcut.
            shortcut={pathname === '/cves' ? null : '/'}
          />
        </form>
      ) : null}
      <div className="hidden grow md:block" />
      <div className="hidden md:block"><CompanySwitcher /></div>
      {can(P.SYNC_VIEW) ? <div className="hidden lg:block"><HealthPill /></div> : null}
      <div className="hidden sm:block">
        <LangSwitch />
      </div>
      <IconButton
        onClick={() => {
          applyTheme(nextTheme);
          onThemeChange(nextTheme);
        }}
        title={themeLabel}
        aria-label={themeLabel}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
      </IconButton>
    </header>
  );
}
