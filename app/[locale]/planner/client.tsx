'use client';

/**
 * Trip Planner: pick location/date/window/method → printable trip report
 * with hour-by-hour conditions, scores, safety status, warnings, missing
 * data and a localized summary. No notifications, ever.
 */
import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import SafetyBanner from '@/components/forecast/safety-banner';
import ScoreChart from '@/components/charts/score-chart';
import BestWindows from '@/components/forecast/best-windows';
import ProviderFooter from '@/components/forecast/provider-footer';
import LocationPicker from '@/components/common/location-picker';
import { useSettings } from '@/lib/hooks/use-settings';
import { useForecast } from '@/lib/hooks/use-forecast';
import { FISHING_METHODS } from '@/lib/models/types';
import type { FishingMethod, TripPlan } from '@/lib/models/types';
import { buildProfile } from '@/lib/models/profiles';
import { scoreSeries } from '@/lib/scoring/engine';
import { findBestWindows } from '@/lib/scoring/windows';
import { assessSafety } from '@/lib/safety/assess';
import { wallClockNowInTimezone } from '@/lib/providers/merge';
import { exportJson } from '@/lib/persistence/export';
import { formatNumber, formatWallTime, formatWallDate } from '@/lib/i18n/format';
import { windDisplay, windUnitLabel, heightDisplay, heightUnitLabel } from '@/lib/units/conversion';

const SAFETY_STATUS_KEY: Record<string, string> = {
  favorable: 'statusFavorable',
  caution: 'statusCaution',
  unfavorable: 'statusUnfavorable',
  dangerous: 'statusDangerous',
  insufficient_data: 'statusInsufficient'
};

const SAFETY_ADVICE_KEY: Record<string, string> = {
  favorable: 'favorableMsg',
  caution: 'cautionMsg',
  unfavorable: 'doNotGo',
  dangerous: 'doNotGo',
  insufficient_data: 'insufficientMsg'
};

interface ReportState {
  plan: TripPlan;
  generatedAt: string;
}

export default function PlannerPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { settings, ready, update } = useSettings();
  const [method, setMethod] = useState<FishingMethod>(settings.defaultMethod);
  const [species, setSpecies] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('06:00');
  const [end, setEnd] = useState('12:00');
  const [report, setReport] = useState<ReportState | null>(null);

  const location = settings.defaultLocation;
  const { data, loading, error, retry } = useForecast(location, 3);

  const todayStr = useMemo(() => {
    const tz = data?.weather?.timezone ?? data?.marine?.timezone ?? location?.timezone ?? 'Africa/Casablanca';
    let today = wallClockNowInTimezone(tz, new Date().toISOString()).slice(0, 10);
    // Midnight-boundary guard: if the provider already rolled over to the
    // next day, the wall-clock day may be outside the fetched series.
    if (data && data.hours.length > 0 && !data.hours.some((h) => h.time.startsWith(today))) {
      today = data.hours[0].time.slice(0, 10);
    }
    return today;
  }, [data, location]);

  const computed = useMemo(() => {
    if (!report || !data || !location) return null;
    const { plan } = report;
    const startIso = `${plan.date}T${plan.startTime}`;
    const endIso = `${plan.date}T${plan.endTime}`;
    const hours = data.hours.filter((h) => h.time >= startIso && h.time <= endIso);
    if (hours.length === 0) return null;
    const profile = buildProfile(plan.method, 'generic');
    const scores = scoreSeries(hours, profile, data.sunriseByDate, data.fetchedAt, report.generatedAt);
    const windows = findBestWindows(scores, { minLengthHours: 2, maxWindows: 3 });
    const safety = assessSafety({ hours, method: plan.method, warnings: [], nowIso: report.generatedAt });
    const avg = Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length);
    const sun = data.sunriseByDate[plan.date];
    const windVals = hours.map((h) => h.windSpeed).filter((v): v is number => v != null);
    const gustVals = hours.map((h) => h.windGusts).filter((v): v is number => v != null);
    const waveVals = hours.map((h) => h.waveHeight).filter((v): v is number => v != null);
    const rainTotal = hours.reduce((a, h) => a + (h.precipitation ?? 0), 0);
    const missingKeys = [...new Set(hours.flatMap((h) => h.missing))];
    const withinHorizon = hours.every((h) => h.time.slice(0, 10) <= (data.hours[data.hours.length - 1]?.time ?? '').slice(0, 10));
    return { plan, hours, scores, windows, safety, avg, sun, windVals, gustVals, waveVals, rainTotal, missingKeys, withinHorizon };
  }, [report, data, location]);

  function generate() {
    if (!location) return;
    const plan: TripPlan = {
      id: `plan_${Date.now()}`,
      createdAt: new Date().toISOString(),
      location,
      date: date || todayStr,
      startTime: start,
      endTime: end,
      method,
      targetSpecies: species
    };
    setReport({ plan, generatedAt: new Date().toISOString() });
  }

  if (!ready) return <LoadingState />;

  return (
    <div className="space-y-4">
      <h1 className="no-print text-xl font-extrabold">{t('nav.planner')}</h1>

      {/* form */}
      <div className="no-print">
        <Card>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label={t('planner.location')}>
                <LocationPicker
                  value={location}
                  onChange={(loc) => {
                    update({ defaultLocation: loc });
                    setReport(null);
                  }}
                  compact
                />
              </Field>
              <Field label={t('planner.date')}>
                <TextInput type="date" dir="ltr" value={date} min={todayStr} onChange={(e) => { setDate(e.target.value); setReport(null); }} />
              </Field>
              <Field label={t('planner.method')}>
                <Select value={method} onChange={(e) => { setMethod(e.target.value as FishingMethod); setReport(null); }}>
                  {FISHING_METHODS.map((m) => (
                    <option key={m} value={m}>{t(`methods.${m}`)}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('planner.start')}>
                <TextInput type="time" dir="ltr" value={start} onChange={(e) => { setStart(e.target.value); setReport(null); }} />
              </Field>
              <Field label={t('planner.end')}>
                <TextInput type="time" dir="ltr" value={end} onChange={(e) => { setEnd(e.target.value); setReport(null); }} />
              </Field>
              <Field label={t('logbook.species')}>
                <TextInput value={species} onChange={(e) => setSpecies(e.target.value)} />
              </Field>
            </div>
            <div className="mt-3 flex gap-2">
              <Button onClick={generate} disabled={!location}>
                {t('planner.generate')}
              </Button>
              {report ? (
                <>
                  <Button variant="secondary" onClick={() => window.print()}>{t('common.print')}</Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (computed) exportJson('sniper-fishing-trip-report.json', computed);
                    }}
                  >
                    {t('planner.exportReport')}
                  </Button>
                </>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </div>

      {loading && !data ? (
        <LoadingState />
      ) : error && !data ? (
        <ErrorState message={t(error)} onRetry={retry} />
      ) : !report ? (
        <EmptyState title={t('planner.title')} hint={`${start}–${end}`} />
      ) : computed ? (
        <div className="space-y-4">
          {/* summary */}
          <Card className="print-block">
            <CardHeader
              title={t('planner.report')}
              subtitle={`${formatWallDate(locale, computed.plan.date, { weekday: true })} · ${formatWallTime(computed.plan.startTime)}–${formatWallTime(computed.plan.endTime)}`}
            />
            <CardBody>
              <p className="label-base mb-2">{t('planner.summary')}</p>
              <ul className="space-y-1.5 text-sm">
                <li>{t('planner.sumSession', { location: computed.plan.location.name, start: formatWallTime(computed.plan.startTime), end: formatWallTime(computed.plan.endTime), method: t(`methods.${computed.plan.method}`) })}</li>
                {computed.windVals.length > 0 ? (
                  <li>
                    {t('planner.sumWind', {
                      min: formatNumber(locale, Math.min(...computed.windVals), 0),
                      max: formatNumber(locale, Math.max(...computed.windVals), 0),
                      peak: formatNumber(locale, Math.max(...computed.gustVals), 0),
                      windUnit: windUnitLabel(settings.windUnit)
                    })}
                  </li>
                ) : null}
                {computed.waveVals.length > 0 ? (
                  <li>
                    {t('planner.sumWave', {
                      min: formatNumber(locale, Math.min(...computed.waveVals), 1),
                      max: formatNumber(locale, Math.max(...computed.waveVals), 1),
                      h: heightUnitLabel(settings.distanceUnit)
                    })}
                  </li>
                ) : null}
                <li>{t('planner.sumRain', { total: formatNumber(locale, computed.rainTotal, 1) })}</li>
                {computed.sun ? (
                  <li>{t('planner.sumSun', { rise: formatWallTime(computed.sun.sunrise), set: formatWallTime(computed.sun.sunset) })}</li>
                ) : null}
                <li>{t('planner.sumScore', { avg: String(computed.avg) })}</li>
                <li>{t('planner.sumSafety', { status: t(`safety.${SAFETY_STATUS_KEY[computed.safety.status]}`) })}</li>
                <li className="font-semibold">
                  {t('planner.sumAdvice', { advice: t(`safety.${SAFETY_ADVICE_KEY[computed.safety.status]}`) })}
                </li>
              </ul>
              {!computed.withinHorizon ? (
                <p className="mt-2 text-xs font-semibold text-amber-600">
                  ⚠ {t('planner.missingData', { list: '— ' + t('common.notAvailable') })}
                </p>
              ) : null}
            </CardBody>
          </Card>

          <div className="no-print">
            <SafetyBanner assessment={computed.safety} method={t(`methods.${computed.plan.method}`)} />
          </div>

          <Card className="print-block">
            <CardHeader title={t('planner.hourlyTable')} />
            <CardBody className="overflow-x-auto p-0">
              <table className="w-full min-w-[640px] text-start text-xs">
                <thead>
                  <tr className="border-b border-navy-200 text-navy-500 dark:border-navy-700">
                    <th className="px-3 py-2 text-start font-bold">{t('planner.date')}</th>
                    <th className="px-3 py-2 text-start font-bold">{t('wind.speed')}</th>
                    <th className="px-3 py-2 text-start font-bold">{t('wind.gusts')}</th>
                    <th className="px-3 py-2 text-start font-bold">{t('wave.height')}</th>
                    <th className="px-3 py-2 text-start font-bold">{t('weather.precip')}</th>
                    <th className="px-3 py-2 text-start font-bold">{t('weather.temperature')}</th>
                    <th className="px-3 py-2 text-start font-bold">{t('score.title')}</th>
                  </tr>
                </thead>
                <tbody>
                  {computed.hours.map((h, i) => (
                    <tr key={h.time} className="border-b border-navy-100 dark:border-navy-800">
                      <td className="ltr px-3 py-1.5 font-semibold">{formatWallTime(h.time)}</td>
                      <td className="ltr px-3 py-1.5">{h.windSpeed != null ? `${formatNumber(locale, windDisplay(h.windSpeed, settings.windUnit) ?? 0)} ${windUnitLabel(settings.windUnit)}` : '—'}</td>
                      <td className="ltr px-3 py-1.5">{h.windGusts != null ? `${formatNumber(locale, windDisplay(h.windGusts, settings.windUnit) ?? 0)}` : '—'}</td>
                      <td className="ltr px-3 py-1.5">{h.waveHeight != null ? `${formatNumber(locale, heightDisplay(h.waveHeight, settings.distanceUnit) ?? 0)} ${heightUnitLabel(settings.distanceUnit)}` : '—'}</td>
                      <td className="ltr px-3 py-1.5">{h.precipitation != null ? `${formatNumber(locale, h.precipitation, 1)} mm` : '—'}</td>
                      <td className="ltr px-3 py-1.5">{h.temperature != null ? `${formatNumber(locale, h.temperature, 1)} °C` : '—'}</td>
                      <td className="ltr px-3 py-1.5 font-bold">{computed.scores[i]?.score ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="print-block">
              <CardHeader title={t('score.title')} />
              <CardBody>
                <ScoreChart hours={computed.scores} />
              </CardBody>
            </Card>
            <Card className="print-block">
              <CardHeader title={t('score.bestWindows')} />
              <CardBody>
                <BestWindows windows={computed.windows} hours={computed.scores} />
              </CardBody>
            </Card>
          </div>

          <Card className="print-block">
            <CardHeader title={t('planner.warnings')} />
            <CardBody>
              {computed.missingKeys.length > 0 ? (
                <p className="text-sm text-navy-600 dark:text-navy-300">
                  {t('planner.missingData', { list: computed.missingKeys.join(', ') })}
                </p>
              ) : (
                <p className="text-sm text-navy-600 dark:text-navy-300">{t('planner.noMissing')}</p>
              )}
              <p className="mt-2 text-xs text-navy-400">{t('safety.disclaimer')}</p>
              <p className="mt-1 text-xs text-navy-400">{t('settings.scoreDisclaimer')}</p>
            </CardBody>
          </Card>

          {data ? (
            <div className="no-print">
              <ProviderFooter merged={data} nowIso={report.generatedAt} />
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState title={t('common.noData')} hint={report ? `${report.plan.date} ${report.plan.startTime}–${report.plan.endTime}` : ''} />
      )}
    </div>
  );
}
