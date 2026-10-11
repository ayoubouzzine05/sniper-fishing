import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const LOCALES = ['ary', 'ar', 'fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const RTL_LOCALES: Locale[] = ['ary', 'ar'];

export function isRtl(locale: string): boolean {
  return locale === 'ary' || locale === 'ar';
}

export const routing = defineRouting({
  locales: [...LOCALES],
  defaultLocale: 'ary',
  localePrefix: 'always',
  // No Accept-Language guessing: first-time visitors always get the default
  // locale (Moroccan Darija) and their explicit onboarding choice. Detection
  // may SUGGEST but must never override — and a wrong guess costs every
  // fresh visitor an extra server+client redirect before onboarding.
  localeDetection: false
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
