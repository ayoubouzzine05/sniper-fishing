import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

/**
 * next-intl request configuration.
 * Locale is resolved by the middleware (cookie / subpath / default 'ary').
 *
 * Note on 'ary' (Moroccan Darija): this is a project-defined dialect variant
 * locale id. It is not a universally standardized written language; the app
 * formats numbers/dates for 'ary' using the 'ar-MA' locale with Latin digits
 * (see lib/i18n/format.ts), which is standard Moroccan practice.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !(routing.locales as readonly string[]).includes(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
