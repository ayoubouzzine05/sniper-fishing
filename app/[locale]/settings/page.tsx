import PageClient from './client';

/**
 * Keep in sync with LOCALES in i18n/routing.ts.
 * (Hardcoded on purpose: importing the routing module from a page file
 * breaks generateStaticParams collection in the `output: 'export'` build
 * used for the Android bundle — verified against Next 14.2 + next-intl 3.)
 */
const LOCALES = ['ary', 'ar', 'fr', 'en'] as const;

/**
 * Static-export support (Android/Capacitor): generate one static build per
 * locale. No-op on regular web builds (middleware-based routing).
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default function Page() {
  return <PageClient />;
}
