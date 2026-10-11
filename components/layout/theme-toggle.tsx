'use client';

import { useTranslations } from 'next-intl';
import { useSettings } from '@/lib/hooks/use-settings';
import type { ThemeMode } from '@/lib/models/types';

const ORDER: ThemeMode[] = ['light', 'dark', 'system'];

export default function ThemeToggle() {
  const t = useTranslations('settings');
  const { settings, update } = useSettings();

  function next() {
    const i = ORDER.indexOf(settings.theme);
    const nextTheme = ORDER[(i + 1) % ORDER.length] ?? 'light';
    void update({ theme: nextTheme });
  }

  const label =
    settings.theme === 'light' ? t('themeLight') : settings.theme === 'dark' ? t('themeDark') : t('themeSystem');

  return (
    <button
      onClick={next}
      aria-label={`${t('theme')}: ${label}`}
      title={label}
      className="rounded-lg p-2 text-navy-600 transition hover:bg-navy-100 dark:text-navy-300 dark:hover:bg-navy-800"
    >
      {settings.theme === 'dark' ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}
