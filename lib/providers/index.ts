/**
 * Provider facade — the only module UI code talks to for forecast data.
 *
 * - Fetches marine + atmospheric data in parallel (Promise.allSettled):
 *   one provider failing degrades the UI instead of blanking it.
 * - Returns explicit per-provider error strings (never fake data).
 * - Tides and official warnings are exposed through provider interfaces
 *   that currently return "none" (documented).
 */
import type { ForecastLocation, MergedForecast, MarineWarning, TidePrediction } from '@/lib/models/types';
import { fetchMarine } from './open-meteo/marine';
import { fetchWeather } from './open-meteo/forecast';
import { mergeForecasts, wallClockNowInTimezone } from './merge';
import { tideProvider } from './tides';
import { warningProvider } from './warnings';
import { ProviderError } from './http';

export { ProviderError };

export interface FetchMergedOptions {
  days?: number;
  nowIso?: string;
}

export async function fetchMergedForecast(
  location: ForecastLocation,
  options: FetchMergedOptions = {}
): Promise<MergedForecast> {
  const days = options.days ?? 3;
  const nowIso = options.nowIso ?? new Date().toISOString();

  const [marineRes, weatherRes] = await Promise.allSettled([
    fetchMarine(location, days),
    fetchWeather(location, days)
  ]);

  const marine = marineRes.status === 'fulfilled' ? marineRes.value : null;
  const weather = weatherRes.status === 'fulfilled' ? weatherRes.value : null;

  const marineError =
    marineRes.status === 'rejected'
      ? providerErrorMessage(marineRes.reason)
      : null;
  const weatherError =
    weatherRes.status === 'rejected'
      ? providerErrorMessage(weatherRes.reason)
      : null;

  const { hours, sunriseByDate } = mergeForecasts(marine, weather, location);
  const tz = weather?.timezone ?? marine?.timezone ?? location.timezone ?? 'auto';

  return {
    location,
    hours,
    sunriseByDate,
    marine,
    weather,
    marineError,
    weatherError,
    fetchedAt: nowIso,
    fromCache: {
      marine: false,
      weather: false
    },
    sources: {
      marine: marine?.source ?? null,
      weather: weather?.source ?? null
    }
  };
}

/** Convenience for the dashboard: merged forecast + current snapshot. */
export async function fetchCurrentConditions(
  location: ForecastLocation
): Promise<{
  merged: MergedForecast;
  nowWallTime: string;
}> {
  const nowIso = new Date().toISOString();
  const merged = await fetchMergedForecast(location, { nowIso });
  const tz =
    merged.weather?.timezone ?? merged.marine?.timezone ?? location.timezone ?? 'auto';
  return { merged, nowWallTime: wallClockNowInTimezone(tz, nowIso) };
}

export async function fetchTides(location: ForecastLocation): Promise<TidePrediction | null> {
  return tideProvider.getTides(location);
}

export async function fetchWarnings(location: ForecastLocation): Promise<MarineWarning[]> {
  return warningProvider.getWarnings(location);
}

export function providerErrorMessage(e: unknown): string {
  if (e instanceof ProviderError) {
    if (e.kind === 'timeout') return 'timeout';
    if (e.kind === 'network') return 'network';
    if (e.kind === 'http') return `http_${e.status ?? 'unknown'}`;
    if (e.kind === 'parse') return 'parse';
    return 'api';
  }
  return 'api';
}

/** Map an error-kind string to an i18n key under `errors.*`. */
export function errorI18nKey(kind: string): string {
  switch (kind) {
    case 'timeout':
      return 'errors.timeout';
    case 'network':
      return 'errors.network';
    case 'parse':
      return 'errors.parse';
    default:
      return 'errors.api';
  }
}
