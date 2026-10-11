'use client';

/**
 * Safety assessment banner.
 *
 * SAFETY-FIRST CONTRACT: when the status is 'unfavorable' or 'dangerous' the
 * banner overrides any positive fishing-score messaging with an explicit
 * "do not go out" recommendation. Official warnings are visually and
 * textually separated from app-generated alerts.
 */
import { useLocale, useTranslations } from 'next-intl';
import type { SafetyAssessment, SafetyStatus } from '@/lib/models/types';
import { Badge, safetyTone } from '@/components/ui/badge';
import { IconAlert } from '@/components/layout/icons';
import { windDisplay, windUnitLabel } from '@/lib/units/conversion';
import { useSettings } from '@/lib/hooks/use-settings';

const STATUS_KEY: Record<SafetyStatus, string> = {
  favorable: 'statusFavorable',
  caution: 'statusCaution',
  unfavorable: 'statusUnfavorable',
  dangerous: 'statusDangerous',
  insufficient_data: 'statusInsufficient'
};

const STATUS_MESSAGE: Record<SafetyStatus, string> = {
  favorable: 'favorableMsg',
  caution: 'cautionMsg',
  unfavorable: 'doNotGo',
  dangerous: 'doNotGo',
  insufficient_data: 'insufficientMsg'
};

export default function SafetyBanner({
  assessment,
  method
}: {
  assessment: SafetyAssessment;
  method: string;
}) {
  const t = useTranslations('safety');
  const locale = useLocale();
  const { settings } = useSettings();

  const fmtWind = (v: number | undefined) =>
    v == null ? '—' : `${windDisplay(v, settings.windUnit) ?? '—'} ${windUnitLabel(settings.windUnit)}`;
  const fmtM = (v: number | undefined) => (v == null ? '—' : v.toFixed(1));

  const statusLabel = t(STATUS_KEY[assessment.status]);
  const message = t(STATUS_MESSAGE[assessment.status]);
  const tone = safetyTone(assessment.status);
  const officialAlerts = assessment.alerts.filter((a) => a.official);
  const appAlerts = assessment.alerts.filter((a) => !a.official);
  const doNotGo = assessment.doNotGoOut;

  const alertText = (key: string, params: Record<string, string | number>) => {
    const p = { ...params };
    if (p.v != null && typeof p.v === 'number' && p.v <= 30) p.v = fmtWind(p.v);
    if (p.lim != null && typeof p.lim === 'number' && p.lim <= 30) p.lim = `${fmtM(p.lim)} m`;
    if (p.method !== undefined) p.method = method;
    return t(key, p as Record<string, string>);
  };

  return (
    <section
      aria-label={t('title')}
      className={`print-block rounded-xl border p-4 ${
        doNotGo
          ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
          : assessment.status === 'caution'
            ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30'
            : 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <IconAlert
          className={`h-5 w-5 ${doNotGo ? 'text-red-600' : assessment.status === 'caution' ? 'text-amber-600' : 'text-emerald-600'}`}
        />
        <h3 className="text-sm font-bold">{t('title')}</h3>
        <Badge tone={tone}>{statusLabel}</Badge>
      </div>

      <p className={`mt-2 text-sm font-semibold ${doNotGo ? 'text-red-800 dark:text-red-200' : 'text-navy-800 dark:text-navy-100'}`}>
        {message}
      </p>

      {appAlerts.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-navy-700 dark:text-navy-200">
          {appAlerts.map((a, i) => (
            <li key={i} className="flex gap-1.5">
              <span aria-hidden>•</span>
              <span>{alertText(a.key, a.params)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {officialAlerts.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs font-semibold text-red-700 dark:text-red-300">
          {officialAlerts.map((a, i) => (
            <li key={i}>⚠ {t('official')}: {alertText(a.key, a.params)}</li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-[11px] leading-relaxed text-navy-500 dark:text-navy-400">
        {t('appGenerated')}
        <br />
        {t('disclaimer')}
      </p>
      {locale ? null : null}
    </section>
  );
}
