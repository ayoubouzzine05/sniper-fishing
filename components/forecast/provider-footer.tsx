'use client';

/**
 * Data provenance footer: providers, license/attribution, timestamps and
 * cache age. Every displayed dataset carries its source, timestamp and
 * availability status.
 */
import { useLocale, useTranslations } from 'next-intl';
import type { MergedForecast } from '@/lib/models/types';
import { cacheAgeMinutes } from '@/lib/providers/http';
import { formatAge, formatInstant } from '@/lib/i18n/format';

export default function ProviderFooter({
  merged,
  nowIso
}: {
  merged: MergedForecast;
  nowIso: string;
}) {
  const t = useTranslations();
  const locale = useLocale();

  const items: { label: string; failedLabel: string; ok: boolean; age: number | null }[] = [
    {
      label: merged.sources.marine?.attribution ?? t('dashboard.providerMarine'),
      failedLabel: t('dashboard.marineFailed'),
      ok: merged.marine != null,
      age: merged.marine ? cacheAgeMinutes(merged.marine.fetchedAt, nowIso) : null
    },
    {
      label: merged.sources.weather?.attribution ?? t('dashboard.providerWeather'),
      failedLabel: t('dashboard.weatherFailed'),
      ok: merged.weather != null,
      age: merged.weather ? cacheAgeMinutes(merged.weather.fetchedAt, nowIso) : null
    }
  ];

  return (
    <footer className="mt-3 space-y-1 rounded-lg bg-navy-50 px-3 py-2 text-[11px] text-navy-500 dark:bg-navy-900/60 dark:text-navy-400">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className={`inline-block h-2 w-2 rounded-full ${it.ok ? 'bg-emerald-500' : 'bg-red-500'}`}
            />
            <span>{it.label}</span>
            {it.ok ? (
              <span className="ltr">
                · {t('common.dataAsOf', { time: formatInstant(locale, it.age != null ? new Date(Date.parse(nowIso) - (it.age * 60_000)).toISOString() : nowIso) })}
              </span>
            ) : (
              <span className="font-semibold text-red-600 dark:text-red-400">{it.failedLabel}</span>
            )}
          </span>
        ))}
      </div>
      <p>{t('settings.attribution')}</p>
    </footer>
  );
}
