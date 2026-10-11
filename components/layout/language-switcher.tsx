'use client';

/**
 * Language selector. Changing the language:
 *  1. persists the preference in settings (IndexedDB),
 *  2. navigates to the same page under the new locale (next-intl), keeping
 *     the current page, form state where component-local, and all data.
 */
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { useSettings } from '@/lib/hooks/use-settings';
import type { AppLanguage } from '@/lib/models/types';

const LOCALES: AppLanguage[] = ['ary', 'ar', 'fr', 'en'];

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const t = useTranslations('langNames');
  const router = useRouter();
  const pathname = usePathname();
  const { update } = useSettings();

  function pick(next: AppLanguage) {
    void update({ language: next });
    router.replace(pathname, { locale: next });
  }

  if (compact) {
    return (
      <select
        aria-label="Language"
        value={locale}
        onChange={(e) => pick(e.target.value as AppLanguage)}
        className="input-base w-auto px-2 py-1.5 text-xs"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} dir="auto">
            {t(l)}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Language">
      {LOCALES.map((l) => (
        <button
          key={l}
          role="radio"
          aria-checked={locale === l}
          onClick={() => pick(l)}
          dir="auto"
          className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition
            ${
              locale === l
                ? 'border-ocean-500 bg-ocean-50 text-ocean-800 dark:bg-ocean-900/40 dark:text-ocean-200'
                : 'border-navy-200 bg-white text-navy-700 hover:border-ocean-400 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-200'
            }`}
        >
          {t(l)}
        </button>
      ))}
    </div>
  );
}
