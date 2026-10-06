'use client';

import { LANGS, useI18n } from '@/i18n';

export function LangSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t('shell.lang')} className="flex rounded-lg border border-line-strong bg-surface p-0.5 text-sm font-medium">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === lang}
          className={`h-8 rounded-md px-3 transition-colors ${l === lang ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:text-ink'}`}
          onClick={() => setLang(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
