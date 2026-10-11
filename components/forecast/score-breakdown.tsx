'use client';

/**
 * Transparent explanation of the score: every contributing factor with its
 * measured value, its direction (positive/negative) and a human explanation.
 */
import { useLocale, useTranslations } from 'next-intl';
import type { HourScore } from '@/lib/models/types';
import { formatNumber } from '@/lib/i18n/format';
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

export default function ScoreBreakdown({ hour }: { hour: HourScore | null }) {
  const t = useTranslations('score');
  const locale = useLocale();

  if (!hour) {
    return null;
  }

  return (
    <ul className="space-y-2">
      {hour.factors.map((f) => {
        const name = t(FACTOR_KEY[f.key] ?? 'factorWind');
        const val =
          f.value == null
            ? t('common.notAvailable')
            : `${formatNumber(locale, f.value, 2)}${f.key === 'wind' || f.key === 'gusts' ? ' km/h' : f.key === 'wave' || f.key === 'swell' ? ' m' : f.key === 'visibility' ? ' km' : ''}`;
        const detail =
          f.detail != null ? ` (${formatNumber(locale, f.detail, 1)})` : '';
        const tone = !f.available ? 'neutral' : f.positive ? 'good' : 'warn';
        const expKey = `score.${f.explanationKey}`;
        const explanation = t(f.explanationKey, {
          v: f.value == null ? '—' : formatNumber(locale, f.value, 2),
          age: ''
        });
        void expKey;
        return (
          <li key={f.key} className="flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <div className="font-semibold text-navy-800 dark:text-navy-100">
                {name}{' '}
                <span className="ltr text-xs font-normal text-navy-500 dark:text-navy-400">
                  {val}
                  {detail}
                </span>
              </div>
              <div className="text-xs text-navy-500 dark:text-navy-400">{explanation}</div>
            </div>
            <Badge tone={tone} className="ltr shrink-0">
              {formatNumber(locale, f.score01 * 100, 0)}%
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
