'use client';

/**
 * Current-conditions grid. Every tile shows its unit, its source and its
 * availability state; missing data renders an explicit "not available"
 * state — never a made-up number.
 */
import { useLocale, useTranslations } from 'next-intl';
import type { ConditionSnapshot } from '@/lib/models/types';
import {
  windDisplay,
  windUnitLabel,
  heightDisplay,
  heightUnitLabel,
  tempDisplay,
  tempUnitLabel
} from '@/lib/units/conversion';
import { compassFromDegrees } from '@/lib/geo/wind';
import { formatNumber } from '@/lib/i18n/format';
import { useSettings } from '@/lib/hooks/use-settings';

interface Tile {
  label: string;
  value: string;
  sub?: string;
  missing: boolean;
}

function wmoLabel(t: (k: string) => string, code: number | null): string {
  if (code == null) return t('weather.unknown');
  if (code === 0) return t('weather.clear');
  if (code === 1) return t('weather.mainlyClear');
  if (code === 2) return t('weather.partlyCloudy');
  if (code === 3) return t('weather.overcast');
  if (code === 45 || code === 48) return t('weather.fog');
  if (code >= 51 && code <= 57) return t('weather.drizzle');
  if (code >= 61 && code <= 67) return t('weather.rain');
  if (code >= 71 && code <= 77) return t('weather.snow');
  if (code >= 80 && code <= 82) return t('weather.rain');
  if (code >= 85 && code <= 86) return t('weather.heavyRain');
  if (code >= 95) return t('weather.thunderstorm');
  return t('weather.unknown');
}

export default function ConditionsGrid({
  snapshot,
  sunrise,
  sunset
}: {
  snapshot: ConditionSnapshot;
  sunrise: string | null;
  sunset: string | null;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { settings } = useSettings();

  const n = (v: number | null, d = 1) => (v == null ? '—' : formatNumber(locale, v, d));
  const wind = windDisplay(snapshot.windSpeed, settings.windUnit);
  const gusts = windDisplay(snapshot.windGusts, settings.windUnit);
  const wave = heightDisplay(snapshot.waveHeight, settings.distanceUnit);
  const swell = heightDisplay(snapshot.swellHeight, settings.distanceUnit);
  const temp = tempDisplay(snapshot.temperature, settings.tempUnit);
  const sst = tempDisplay(snapshot.seaSurfaceTemperature, settings.tempUnit);

  const tiles: Tile[] = [
    {
      label: t('weather.temperature'),
      value: `${n(temp)} ${tempUnitLabel(settings.tempUnit)}`,
      sub: snapshot.apparentTemperature != null ? `${t('weather.apparent')} ${n(tempDisplay(snapshot.apparentTemperature, settings.tempUnit))}` : undefined,
      missing: snapshot.temperature == null
    },
    {
      label: t('wind.speed'),
      value: `${n(wind)} ${windUnitLabel(settings.windUnit)}`,
      sub:
        snapshot.windDirection != null
          ? `${t('wind.direction')} ${t(`compass.${compassFromDegrees(snapshot.windDirection) ?? 'n'}`)}`
          : undefined,
      missing: snapshot.windSpeed == null
    },
    {
      label: t('wind.gusts'),
      value: `${n(gusts)} ${windUnitLabel(settings.windUnit)}`,
      missing: snapshot.windGusts == null
    },
    {
      label: t('wave.height'),
      value: `${n(wave)} ${heightUnitLabel(settings.distanceUnit)}`,
      sub:
        snapshot.waveDirection != null
          ? `${t('wave.direction')} ${t(`compass.${compassFromDegrees(snapshot.waveDirection) ?? 'n'}`)}`
          : undefined,
      missing: snapshot.waveHeight == null
    },
    {
      label: t('wave.swell'),
      value: `${n(swell)} ${heightUnitLabel(settings.distanceUnit)}`,
      sub: snapshot.swellPeriod != null ? `${t('wave.swellPeriod')} ${n(snapshot.swellPeriod, 0)}s` : undefined,
      missing: snapshot.swellHeight == null && snapshot.waveHeight == null
    },
    {
      label: t('ocean.sst'),
      value: `${n(sst)} ${tempUnitLabel(settings.tempUnit)}`,
      missing: snapshot.seaSurfaceTemperature == null
    },
    {
      label: t('ocean.current'),
      value: `${n(windDisplay(snapshot.oceanCurrentVelocity, settings.windUnit))} ${windUnitLabel(settings.windUnit)}`,
      sub:
        snapshot.oceanCurrentDirection != null
          ? `${t(`compass.${compassFromDegrees(snapshot.oceanCurrentDirection) ?? 'n'}`)}`
          : undefined,
      missing: snapshot.oceanCurrentVelocity == null
    },
    {
      label: t('weather.precip'),
      value: snapshot.precipitation != null ? `${n(snapshot.precipitation)} mm${t('common.perHour')}` : '—',
      sub:
        snapshot.precipitationProbability != null
          ? `${t('weather.precipProb')} ${formatNumber(locale, snapshot.precipitationProbability, 0)}%`
          : undefined,
      missing: snapshot.precipitation == null
    },
    {
      label: t('weather.visibility'),
      value: `${n(snapshot.visibility)} km`,
      missing: snapshot.visibility == null
    },
    {
      label: t('weather.cloudCover'),
      value: snapshot.cloudCover != null ? `${formatNumber(locale, snapshot.cloudCover, 0)}%` : '—',
      missing: snapshot.cloudCover == null
    },
    {
      label: t('weather.pressure'),
      value: `${n(snapshot.pressureMsl, 0)} hPa`,
      missing: snapshot.pressureMsl == null
    },
    {
      label: t('weather.humidity'),
      value: snapshot.humidity != null ? `${formatNumber(locale, snapshot.humidity, 0)}%` : '—',
      missing: snapshot.humidity == null
    },
    {
      label: t('weather.temperature'),
      value: wmoLabel(t, snapshot.weatherCode),
      sub: undefined,
      missing: snapshot.weatherCode == null
    },
    {
      label: t('ocean.seaLevel'),
      value: `${n(snapshot.seaLevelHeightMsl, 2)} m`,
      sub: t('settings.tideDisclaimer').slice(0, 40) + '…',
      missing: snapshot.seaLevelHeightMsl == null
    },
    { label: t('daylight.sunrise'), value: sunrise ? sunrise.slice(11, 16) : '—', missing: sunrise == null },
    { label: t('daylight.sunset'), value: sunset ? sunset.slice(11, 16) : '—', missing: sunset == null }
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {tiles.map((tile, i) => (
        <div
          key={i}
          className={`rounded-lg border px-3 py-2 ${
            tile.missing
              ? 'border-dashed border-navy-200 bg-navy-50/50 dark:border-navy-700 dark:bg-navy-900/40'
              : 'border-navy-100 bg-navy-50/70 dark:border-navy-800 dark:bg-navy-950/40'
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-navy-500 dark:text-navy-400">
            {tile.label}
          </div>
          <div className={`ltr mt-0.5 text-sm font-bold ${tile.missing ? 'text-navy-300 dark:text-navy-600' : 'text-navy-900 dark:text-navy-50'}`}>
            {tile.missing ? t('common.notAvailable') : tile.value}
          </div>
          {tile.sub && !tile.missing ? (
            <div className="text-[11px] text-navy-500 dark:text-navy-400">{tile.sub}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
