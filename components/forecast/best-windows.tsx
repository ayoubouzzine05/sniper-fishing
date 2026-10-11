'use client';

/**
 * Best estimated time windows, with reasons (top positive factors at the
 * window's peak hour). Explicitly "estimated" — never a guarantee.
 */
import { useTranslations } from 'next-intl';
import type { BestWindow, HourScore } from '@/lib/models/types';
import { formatWallTime } from '@/lib/i18n/format';
import { Badge } from '@/components/ui/badge';

const FACTOR_KEY: Record<string, string> = {
  wind: 'factorWind',
  gusts: 'factorGusts',
  wave: 'factorWave',
  swell: 'factorSwell',
  rain: 'factorRain',
  visibility: 'factorVisibility',
  daylight: 'factorDaylight',
  seaTemp: 'factorSeaTemp',
  tide: 'factorTide'
};

export default function BestWindows({
  windows,
  hours
}: {
  windows: BestWindow[];
  hours: HourScore[];
}) {
  const t = useTranslations('score');

  if (windows.length === 0) {
    return <p className="text-sm text-navy-500">{t('noWindow')}</p>;
  }

  return (
    <ul className="space-y-2">
      {windows.map((w) => {
        const peak = hours[w.peakIndex];
        const top = peak
          ? [...peak.factors]
              .filter((f) => f.positive && f.available)
              .sort((a, b) => b.score01 - a.score01)
              .slice(0, 3)
              .map((f) => t(FACTOR_KEY[f.key] ?? 'factorWind'))
          : [];
        return (
          <li
            key={w.start}
            className="rounded-lg border border-ocean-200 bg-ocean-50/60 px-3 py-2 dark:border-ocean-800 dark:bg-ocean-900/20"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="ltr text-sm font-bold text-ocean-800 dark:text-ocean-200">
                {formatWallTime(w.start)} – {formatWallTime(w.end)}
              </span>
              <Badge tone="info" className="ltr">
                {w.avgScore}/100
              </Badge>
            </div>
            {top.length > 0 ? (
              <p className="mt-1 text-xs text-navy-600 dark:text-navy-300">
                {t('windowWhy', { reasons: top.join(' · ') })}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
