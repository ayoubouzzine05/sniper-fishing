import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { routing, isRtl } from '@/i18n/routing';
import AppShell from '@/components/layout/app-shell';
import { SettingsProvider } from '@/lib/hooks/use-settings';
import '../globals.css';

/**
 * BCP-47 mapping for the <html lang> attribute.
 * The app locale 'ary' (Moroccan Darija, project-defined variant) is
 * exposed to browsers/assistive tech as 'ar-MA' — the valid IANA tag for
 * Moroccan Arabic. (IANA's 'ary' tag means *Ancient* Arabic — not what
 * we want for spellcheckers, fonts and screen readers.)
 */
const LANG_TAG: Record<string, string> = {
  ary: 'ar-MA',
  ar: 'ar-MA',
  fr: 'fr-MA',
  en: 'en'
};

export const metadata: Metadata = {
  title: {
    default: 'Sniper Fishing — Read the Sea. Find Your Moment.',
    template: '%s · Sniper Fishing'
  },
  description:
    'Open-source marine forecasting and fishing intelligence for recreational anglers. Wind, waves, swell, suitability scores and safety assessment — built Morocco-first, in Darija, Arabic, French and English.',
  applicationName: 'Sniper Fishing',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sniper Fishing'
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: '/icons/apple-icon-180.png'
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f6fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1b2d' }
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
};

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('sf:theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!(routing.locales as readonly string[]).includes(locale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }
  unstable_setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations('meta');

  return (
    <html lang={LANG_TAG[locale] ?? locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={isRtl(locale) ? 'font-arabic' : undefined}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <SettingsProvider>
            <AppShell appName={t('appName')} tagline={t('tagline')}>
              {children}
            </AppShell>
          </SettingsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
