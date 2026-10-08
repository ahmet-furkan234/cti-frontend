'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Icon, cx } from '@/components/ui';
import { LANGS, useI18n } from '@/i18n';
import { applyTheme, type Theme } from '@/lib/theme';

export function SettingsCard({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
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

function Choice({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon?: 'sun' | 'moon'; label: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cx('flex h-12 min-w-36 items-center justify-center gap-2 rounded-xl border px-4 text-[15px] font-medium transition-colors', on ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink')}
    >
      {icon ? <Icon name={icon} size={18} /> : null}
      {label}
    </button>
  );
}

const LANG_NAMES: Record<string, string> = { tr: 'Türkçe', en: 'English' };

/** Per-person display choices. They live in this browser (cookies), so nothing is sent to the server. */
export function Preferences() {
  const { t, lang, setLang } = useI18n();
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'), []);
  const pick = (next: Theme) => { applyTheme(next); setTheme(next); };

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-2">
      <SettingsCard title={t('settings.pref.theme')} desc={t('settings.pref.themeDesc')}>
        <div role="radiogroup" aria-label={t('settings.pref.theme')} className="flex flex-wrap gap-3">
          <Choice on={theme === 'light'} onClick={() => pick('light')} icon="sun" label={t('settings.pref.light')} />
          <Choice on={theme === 'dark'} onClick={() => pick('dark')} icon="moon" label={t('settings.pref.dark')} />
        </div>
      </SettingsCard>
      <SettingsCard title={t('settings.pref.lang')} desc={t('settings.pref.langDesc')}>
        <div role="radiogroup" aria-label={t('settings.pref.lang')} className="flex flex-wrap gap-3">
          {LANGS.map((l) => <Choice key={l} on={l === lang} onClick={() => setLang(l)} label={LANG_NAMES[l] ?? l.toUpperCase()} />)}
        </div>
      </SettingsCard>
      <p className="text-sm text-ink-subtle xl:col-span-2">{t('settings.pref.local')}</p>
    </div>
  );
}
