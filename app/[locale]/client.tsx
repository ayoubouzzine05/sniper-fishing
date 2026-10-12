'use client';
import { Link } from '@/i18n/routing';

/**
 * Dashboard (homepage): current conditions for the selected location,
 * hourly forecast, suitability score + safety for the planned session,
 * best windows, daylight, and full data provenance.
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import ScoreGauge from '@/components/ui/score-gauge';
import SafetyBanner from '@/components/forecast/safety-banner';
import ConditionsGrid from '@/components/forecast/conditions-grid';
import HourlyStrip from '@/components/forecast/hourly-strip';
import ScoreBreakdown from '@/components/forecast/score-breakdown';
import BestWindows from '@/components/forecast/best-windows';
import ProviderFooter from '@/components/forecast/provider-footer';
import ConditionsChart from '@/components/charts/conditions-chart';
import LocationPicker from '@/components/common/location-picker';
import { useSettings } from '@/lib/hooks/use-settings';
import { useForecast } from '@/lib/hooks/use-forecast';
import { buildProfile } from '@/lib/models/profiles';
import { scoreSeries } from '@/lib/scoring/engine';
import { findBestWindows } from '@/lib/scoring/windows';
import { assessSafety } from '@/lib/safety/assess';
import { snapshotNearestNow, wallClockNowInTimezone } from '@/lib/providers/merge';
import { setActiveLocation, getActiveLocation } from '@/lib/state/location-store';
import { COASTAL_TOWNS } from '@/lib/locations/coastal-towns';
import { formatWallTime, formatDurationHours, formatNumber } from '@/lib/i18n/format';
import { daylightDurationHours } from '@/lib/geo/wind';
import type { ConditionSnapshot } from '@/lib/models/types';
import { IconChevron } from '@/components/layout/icons';

export default function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { settings, ready, update } = useSettings();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());
  const [, forceRender] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setNowIso(new Date().toISOString());
      forceRender((x) => x + 1);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const location = getActiveLocation() ?? settings.defaultLocation;
  const { data, loading, error, retry } = useForecast(location, 3);

  const session = useMemo(() => {
    if (!data || !location) return null;
    const tz = data.weather?.timezone ?? data.marine?.timezone ?? location.timezone ?? 'Africa/Casablanca';
    const nowWall = wallClockNowInTimezone(tz, nowIso);
    let today = nowWall.slice(0, 10);
    // Midnight-boundary guard: `nowIso` can be up to a minute stale, so the
    // wall-clock day may not exist in the fetched series when the provider
    // rolled over between page load and data arrival. Fall back to the first
    // day the data actually covers (never an empty assessment).
    if (data.hours.length > 0 && !data.hours.some((h) => h.time.startsWith(today))) {
      today = data.hours[0].time.slice(0, 10);
    }
    const start = `${today}T05:00`;
    const end = `${today}T11:00`;
    const hours: ConditionSnapshot[] = data.hours.filter((h) => h.time >= start && h.time <= end);
    return { today, start, end, hours, nowWall };
  }, [data, location, nowIso]);

  const scoring = useMemo(() => {
    if (!data || !session || session.hours.length < 2) return null;
    const profile = buildProfile(settings.defaultMethod, 'generic');
    const scores = scoreSeries(
      session.hours,
      profile,
      data.sunriseByDate,
      data.fetchedAt,
      nowIso
    );
    const windows = findBestWindows(scores, { minLengthHours: 2, maxWindows: 2 });
    const safety = assessSafety({
      hours: session.hours,
      method: settings.defaultMethod,
      warnings: [],
      nowIso
    });
    const peakIdx = scores.reduce((best, s, i) => (s.score > (scores[best]?.score ?? -1) ? i : best), 0);
    return { scores, windows, safety, peak: scores[peakIdx] ?? null, profile };
  }, [data, session, settings.defaultMethod, nowIso]);

  const current = useMemo(() => {
    if (!data || !session) return null;
    return snapshotNearestNow(data.hours, session.nowWall);
  }, [data, session]);

  const sun = session ? data?.sunriseByDate[session.today] : null;
  const daylightH = sun ? daylightDurationHours(sun.sunrise, sun.sunset) : null;

  if (!ready) return <LoadingState />;

  if (!location) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-xl font-extrabold">{t('dashboard.welcomeBack')}</h1>
        <Card>
          <CardHeader title={t('dashboard.location')} />
          <CardBody className="space-y-4">
            <LocationPicker
              value={null}
              onChange={(loc) => {
                setActiveLocation(loc);
                void update({ defaultLocation: loc });
              }}
            />
            <div>
              <p className="label-base">{t('map.coastalTowns')}</p>
              <div className="flex flex-wrap gap-1.5">
                {COASTAL_TOWNS.map((town) => (
                  <button
                    key={town.id}
                    onClick={() => {
                      setActiveLocation(town);
                      void update({ defaultLocation: town });
                    }}
                    className="rounded-full border border-navy-200 bg-white px-3 py-1 text-xs font-semibold text-navy-700 transition hover:border-ocean-400 hover:text-ocean-700 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-200"
                  >
                    {town.name}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-navy-400">{t('map.coastalTownsNote')}</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-extrabold sm:text-xl">
          {t('dashboard.welcomeBack')}
        </h1>
        <button
          onClick={() => setPickerOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg border border-navy-200 bg-white px-2.5 py-1 text-xs font-semibold text-navy-700 hover:border-ocean-400 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-200"
        >
          <span className="max-w-[200px] truncate">{location.name}</span>
          <IconChevron className="h-3.5 w-3.5 rtl:rotate-180" />
        </button>
      </div>

      {pickerOpen ? (
        <Card>
          <CardBody>
            <LocationPicker
              value={location}
              onChange={(loc) => {
                setActiveLocation(loc);
                void update({ defaultLocation: loc });
                setPickerOpen(false);
              }}
            />
          </CardBody>
        </Card>
      ) : null}

      {loading && !data ? (
        <LoadingState />
      ) : error && !data ? (
        <ErrorState message={t(error)} onRetry={retry} />
      ) : data ? (
        <>
          {/* safety first */}
          {scoring ? (
            <SafetyBanner assessment={scoring.safety} method={t(`methods.${settings.defaultMethod}`)} />
          ) : null}

          {/* score + session */}
          {scoring ? (
            <Card>
              <CardHeader
                title={
                  <span>
                    {t('score.title')} — {t(`methods.${settings.defaultMethod}`)}
                    <span className="ms-2 text-xs font-normal text-navy-400 ltr">
                      {session!.start.slice(11, 16)}–{session!.end.slice(11, 16)}
                    </span>
                  </span>
                }
                subtitle={t('score.scale')}
                action={
                  <Link
                    href="/forecast"
                    className="text-xs font-bold text-ocean-700 hover:underline dark:text-ocean-300"
                  >
                    {t('dashboard.viewForecast')}
                  </Link>
                }
              />
              <CardBody>
                <div className="flex flex-col gap-4 lg:flex-row">
                  <div className="flex flex-col items-center gap-1">
                    <ScoreGauge score={scoring.peak?.score ?? 0} confidence={scoring.peak?.completeness ?? 0} />
                    <span className="text-xs font-semibold text-navy-500">
                      {t('score.completeness')} {formatNumber(locale, Math.round((scoring.peak?.completeness ?? 0) * 100), 0)}%
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <p className="label-base">{t('score.explain')}</p>
                      <ScoreBreakdown hour={scoring.peak} />
                    </div>
                    <div>
                      <p className="label-base">{t('score.bestWindows')}</p>
                      <BestWindows windows={scoring.windows} hours={scoring.scores} />
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ) : null}

          {/* current conditions */}
          {current ? (
            <Card>
              <CardHeader
                title={t('dashboard.current')}
                subtitle={t('common.dataAsOf', { time: formatWallTime(current.time) })}
              />
              <CardBody>
                <ConditionsGrid snapshot={current} sunrise={sun?.sunrise ?? null} sunset={sun?.sunset ?? null} />
                <p className="mt-3 text-xs text-navy-500">
                  {t('daylight.daylight')}: {formatDurationHours(locale, daylightH)} · {t('daylight.sunrise')}{' '}
                  <span className="ltr font-semibold">{sun?.sunrise ? formatWallTime(sun.sunrise) : '—'}</span> · {t('daylight.sunset')}{' '}
                  <span className="ltr font-semibold">{sun?.sunset ? formatWallTime(sun.sunset) : '—'}</span>
                </p>
              </CardBody>
            </Card>
          ) : null}

          {/* hourly */}
          <Card>
            <CardHeader title={t('dashboard.hourly')} />
            <CardBody>
              <HourlyStrip
                hours={data.hours.slice(0, 24)}
                highlightTimes={
                  scoring?.windows.flatMap((w) =>
                    data.hours
                      .filter((h) => h.time >= w.start && h.time <= w.end)
                      .map((h) => h.time)
                  ) ?? []
                }
              />
            </CardBody>
          </Card>

          {/* 48h chart */}
          <Card>
            <CardHeader title={`${t('wind.speed')} + ${t('wave.height')} — 48h`} />
            <CardBody>
              <ConditionsChart hours={data.hours} />
            </CardBody>
          </Card>

          <ProviderFooter merged={data} nowIso={nowIso} />
        </>
      ) : (
        <EmptyState title={t('common.noData')} />
      )}
    </div>
  );
}
