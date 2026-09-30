'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button, Icon, SearchInput, StatusPill } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { LANGS, useI18n } from '@/i18n';
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
  const { t, lang, setLang } = useI18n();
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

  return (
    <header className="topbar">
      <Button variant="ghost" size="sm" className="nav-toggle" onClick={onToggleNav} aria-label={t('shell.menu')} icon="menu" />
      {can(P.CVE_READ) ? (
        <form onSubmit={submit} style={{ width: 420, maxWidth: '100%' }}>
          <SearchInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('shell.searchPlaceholder')}
            // The CVE Explorer has its own big search box that owns the "/" shortcut.
            shortcut={pathname === '/cves' ? null : '/'}
          />
        </form>
      ) : null}
      <div className="grow" />
      {can(P.SYNC_VIEW) ? <HealthPill /> : null}
      <div role="group" aria-label={t('shell.lang')} className="seg">
        {LANGS.map((l) => (
          <button key={l} type="button" className={l === lang ? 'is-on' : ''} onClick={() => setLang(l)}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="icon-btn"
        onClick={() => {
          applyTheme(nextTheme);
          onThemeChange(nextTheme);
        }}
        title={t(theme === 'dark' ? 'shell.theme.toLight' : 'shell.theme.toDark')}
        aria-label={t(theme === 'dark' ? 'shell.theme.toLight' : 'shell.theme.toDark')}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
      </button>
    </header>
  );
}
