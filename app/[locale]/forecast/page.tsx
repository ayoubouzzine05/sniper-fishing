'use client';

/**
 * Fishing Forecast: pick method, regional preset, date window and location
 * → suitability score per hour, transparent breakdown, best windows,
 * safety assessment, and an explicit list of missing data.
 */
import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Select, TextInput } from '@/components/ui/field';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import ScoreGauge from '@/components/ui/score-gauge';
import SafetyBanner from '@/components/forecast/safety-banner';
import ScoreBreakdown from '@/components/forecast/score-breakdown';
import BestWindows from '@/components/forecast/best-windows';
import ScoreChart from '@/components/charts/score-chart';
import ProviderFooter from '@/components/forecast/provider-footer';
import LocationPicker from '@/components/common/location-picker';
import { useSettings } from '@/lib/hooks/use-settings';
import { useForecast } from '@/lib/hooks/use-forecast';
import { FISHING_METHODS } from '@/lib/models/types';
import type { FishingMethod } from '@/lib/models/types';

const DESC_KEY: Record<FishingMethod, string> = {
  surfcasting: 'descSurfcasting',
  shore_spinning: 'descShoreSpinning',
  harbor: 'descHarbor',
  rock: 'descRock',
  float: 'descFloat',
  boat: 'descBoat',
  kayak: 'descKayak'
};
import { buildProfile, type RegionPreset } from '@/lib/models/profiles';
import { scoreSeries } from '@/lib/scoring/engine';
import { findBestWindows } from '@/lib/scoring/windows';
import { assessSafety } from '@/lib/safety/assess';
import { setActiveLocation } from '@/lib/state/location-store';
import { wallClockNowInTimezone } from '@/lib/providers/merge';
import { formatNumber } from '@/lib/i18n/format';

export default function ForecastPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { settings, ready, update } = useSettings();
  const [method, setMethod] = useState<FishingMethod>(settings.defaultMethod);
  const [preset, setPreset] = useState<RegionPreset>('generic');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('05:00');
  const [end, setEnd] = useState('11:00');

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

  const effectiveDate = date || todayStr;

  const result = useMemo(() => {
    if (!data) return null;
    const startIso = `${effectiveDate}T${start}`;
    const endIso = `${effectiveDate}T${end}`;
    const hours = data.hours.filter((h) => h.time >= startIso && h.time <= endIso);
    if (hours.length < 2) return { hours, scores: null };
    const profile = buildProfile(method, preset);
    const scores = scoreSeries(hours, profile, data.sunriseByDate, data.fetchedAt, new Date().toISOString());
    const windows = findBestWindows(scores, { minLengthHours: 2, maxWindows: 3 });
    const safety = assessSafety({ hours, method, warnings: [], nowIso: new Date().toISOString() });
    const avg = Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length);
    const peakIdx = scores.reduce((b, s, i) => (s.score > (scores[b]?.score ?? -1) ? i : b), 0);
    const missingKeys = [...new Set(hours.flatMap((h) => h.missing))];
    return { hours, scores, windows, safety, avg, peakIdx, profile, missingKeys };
  }, [data, effectiveDate, start, end, method, preset]);

  if (!ready) return <LoadingState />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">{t('nav.forecast')}</h1>

      {/* form */}
      <Card>
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t('planner.location')}>
              <LocationPicker
                value={location}
                onChange={(loc) => {
                  setActiveLocation(loc);
                  void update({ defaultLocation: loc });
                }}
                compact
              />
            </Field>
            <Field label={t('planner.method')}>
              <Select value={method} onChange={(e) => setMethod(e.target.value as FishingMethod)}>
                {FISHING_METHODS.map((m) => (
                  <option key={m} value={m}>{t(`methods.${m}`)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Preset" hint="Initial configurable heuristics">
              <Select value={preset} onChange={(e) => setPreset(e.target.value as RegionPreset)}>
                <option value="generic">Generic</option>
                <option value="morocco_atlantic">Morocco — Atlantic</option>
                <option value="morocco_mediterranean">Morocco — Mediterranean</option>
              </Select>
            </Field>
            <Field label={t('planner.date')}>
              <TextInput type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} min={todayStr} max={`${todayStr.slice(0, 8)}31`} />
            </Field>
            <Field label={t('planner.start')}>
              <TextInput type="time" dir="ltr" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label={t('planner.end')}>
              <TextInput type="time" dir="ltr" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
          <p className="mt-2 text-xs text-navy-400">{t(`methods.${DESC_KEY[method]}`)}</p>
        </CardBody>
      </Card>

      {loading && !data ? (
        <LoadingState />
      ) : error && !data ? (
        <ErrorState message={t(error)} onRetry={retry} />
      ) : data && result ? (
        result.scores ? (
          <>
            <SafetyBanner assessment={result.safety} method={t(`methods.${method}`)} />

            <Card>
              <CardHeader title={t('score.title')} subtitle={t('score.scale')} />
              <CardBody>
                <div className="flex flex-col gap-4 lg:flex-row">
                  <div className="flex flex-col items-center gap-1">
                    <ScoreGauge score={result.avg} confidence={result.scores[result.peakIdx]?.completeness ?? 0} />
                    <span className="text-xs font-semibold text-navy-500">
                      {t('score.completeness')} {formatNumber(locale, Math.round((result.scores[result.peakIdx]?.completeness ?? 0) * 100), 0)}%
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <ScoreChart hours={result.scores} />
                  </div>
                </div>
              </CardBody>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader title={t('score.explain')} subtitle={`${t(`methods.${method}`)} · ${result.profile.label}`} />
                <CardBody>
                  <ScoreBreakdown hour={result.scores[result.peakIdx] ?? null} />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title={t('score.bestWindows')} />
                <CardBody>
                  <BestWindows windows={result.windows} hours={result.scores} />
                </CardBody>
              </Card>
            </div>

            {result.missingKeys.length > 0 ? (
              <Card>
                <CardHeader title={t('planner.missingData').split(':')[0]} />
                <CardBody>
                  <p className="text-sm text-navy-600 dark:text-navy-300">
                    {t('planner.missingData', { list: result.missingKeys.join(', ') })}
                  </p>
                </CardBody>
              </Card>
            ) : (
              <p className="text-xs text-navy-400">{t('planner.noMissing')}</p>
            )}

            <p className="text-xs leading-relaxed text-navy-400">{t('settings.scoreDisclaimer')}</p>
            <ProviderFooter merged={data} nowIso={new Date().toISOString()} />
          </>
        ) : (
          <EmptyState title={t('common.noData')} hint={`${start}–${end} ${effectiveDate}`} />
        )
      ) : (
        <EmptyState title={t('common.noData')} />
      )}
    </div>
  );
}
