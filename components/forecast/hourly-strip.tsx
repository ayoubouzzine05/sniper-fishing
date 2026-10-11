'use client';

/**
 * Horizontal strip of the next N hours: wind, wave, precip, weather code.
 * Compact, legible in bright sunlight, works in RTL (scrollable).
 */
import { useLocale, useTranslations } from 'next-intl';
import type { ConditionSnapshot } from '@/lib/models/types';
import { windDisplay, windUnitLabel, heightDisplay, heightUnitLabel } from '@/lib/units/conversion';
import { compassFromDegrees } from '@/lib/geo/wind';
import { formatNumber, formatWallTime } from '@/lib/i18n/format';
import { useSettings } from '@/lib/hooks/use-settings';

function weatherGlyph(code: number | null): string {
  if (code == null) return '–';
  if (code === 0) return '☀';
  if (code <= 2) return '🌤';
  if (code === 3) return '☁';
  if (code === 45 || code === 48) return '🌫';
  if (code >= 51 && code <= 67) return '🌦';
  if (code >= 71 && code <= 77) return '🌨';
  if (code >= 80 && code <= 82) return '🌧';
  if (code >= 85 && code <= 86) return '🌧';
  if (code >= 95) return '⛈';
  return '–';
}

export default function HourlyStrip({
  hours,
  highlightTimes
}: {
  hours: ConditionSnapshot[];
  highlightTimes?: string[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { settings } = useSettings();

  if (hours.length === 0) {
    return <p className="text-sm text-navy-500">{t('common.noData')}</p>;
  }

  return (
    <div className="chart-ltr flex gap-1.5 overflow-x-auto pb-2" role="list" aria-label={t('dashboard.hourly')}>
      {hours.map((h) => {
        const wind = windDisplay(h.windSpeed, settings.windUnit);
        const wave = heightDisplay(h.waveHeight, settings.distanceUnit);
        const hi = highlightTimes?.includes(h.time);
        return (
          <div
            key={h.time}
            role="listitem"
            className={`flex min-w-[76px] flex-col items-center gap-1 rounded-lg border px-2 py-2
              ${hi ? 'border-ocean-500 bg-ocean-50 dark:bg-ocean-900/30' : 'border-navy-100 bg-white dark:border-navy-800 dark:bg-navy-900'}`}
          >
            <span className="text-[11px] font-bold text-navy-700 dark:text-navy-200">
              {formatWallTime(h.time)}
            </span>
            <span className="text-lg leading-none" aria-hidden>
              {weatherGlyph(h.weatherCode)}
            </span>
            <span className="ltr text-[11px] font-semibold text-navy-800 dark:text-navy-100">
              {wind == null ? '—' : `${formatNumber(locale, wind, 0)}`}
              <span className="ms-0.5 font-normal text-navy-400">{h.windDirection != null ? t(`compass.${compassFromDegrees(h.windDirection) ?? 'n'}`) : ''}</span>
            </span>
            <span className="ltr text-[11px] text-ocean-700 dark:text-ocean-300">
              {wave == null ? '—' : `${formatNumber(locale, wave, 1)}${heightUnitLabel(settings.distanceUnit)}`}
            </span>
            <span className="ltr text-[10px] text-navy-400">
              {h.precipitation != null && h.precipitation > 0.05
                ? `${t('weather.precip')} ${formatNumber(locale, h.precipitation, 0)}mm`
                : h.precipitationProbability != null && h.precipitationProbability >= 30
                  ? `${formatNumber(locale, h.precipitationProbability, 0)}%`
                  : '·'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
