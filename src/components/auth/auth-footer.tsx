'use client';

import { LANGS, useI18n } from '@/i18n';

export function AuthFooter() {
  const { lang, setLang } = useI18n();
  return (
    <div className="seg" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button key={l} type="button" className={l === lang ? 'is-on' : ''} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
