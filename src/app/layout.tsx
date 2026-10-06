import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import { LANG_COOKIE, type Lang } from '@/i18n/define';
import { DEFAULT_THEME, THEME_COOKIE, type Theme } from '@/lib/theme';
// Self-hosted (no build-time network dependency); the @font-face rules carry latin + latin-ext subsets.
import '@fontsource-variable/figtree';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'CTI Web', template: '%s · CTI Web' },
  description: 'Cyber threat intelligence and vulnerability management',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const lang: Lang = jar.get(LANG_COOKIE)?.value === 'en' ? 'en' : 'tr';
  const theme: Theme = (jar.get(THEME_COOKIE)?.value as Theme | undefined) === 'dark' ? 'dark' : DEFAULT_THEME;
  return (
    <html lang={lang} data-theme={theme}>
      <body>
        <Providers initialLang={lang}>{children}</Providers>
      </body>
    </html>
  );
}
