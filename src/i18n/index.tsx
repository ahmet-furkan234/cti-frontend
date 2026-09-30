'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_LANG, LANG_COOKIE, type Lang } from './define';
import { MESSAGES, type MessageKey } from './messages';

export type { Lang, MessageKey };
export { LANGS, LANG_COOKIE } from './define';

const YEAR = 60 * 60 * 24 * 365;

type Vars = Record<string, string | number>;
export type TFunction = (key: MessageKey, vars?: Vars) => string;

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TFunction;
  /** BCP-47 locale for Intl formatting */
  locale: string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  const entry = MESSAGES[key];
  const text: string = entry ? entry[lang] : key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : `{${name}}`));
}

export function I18nProvider({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang ?? DEFAULT_LANG);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${YEAR}; samesite=lax`;
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      locale: lang === 'tr' ? 'tr-TR' : 'en-US',
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

export function useT(): TFunction {
  return useI18n().t;
}
