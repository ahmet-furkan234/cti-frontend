export type Lang = 'tr' | 'en';
export const LANGS: Lang[] = ['tr', 'en'];
export const DEFAULT_LANG: Lang = 'tr';
/** Cookie name lives here (not in the 'use client' provider) so server components can import the real string. */
export const LANG_COOKIE = 'cti_lang';

export interface Message {
  tr: string;
  en: string;
}

/** Keeps both translations next to each other; `satisfies` gives literal keys for typed `t()`. */
export function defineMessages<const T extends Record<string, Message>>(messages: T): T {
  return messages;
}
