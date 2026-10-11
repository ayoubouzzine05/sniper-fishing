/**
 * Open-Meteo Forecast (atmospheric) API adapter.
 *
 * Docs: https://open-meteo.com/en/docs
 * License: CC BY 4.0, non-commercial use, <10,000 calls/day.
 */
import { z } from 'zod';
import { fetchJson } from '../http';
import type {
  ForecastLocation,
  ProviderMetadata,
  WeatherForecast,
  WeatherHour,
  WeatherDay
} from '@/lib/models/types';

const HOUR_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const nullableNumber = z.number().nullable();

const forecastResponseSchema = z
  .object({
    latitude: z.number(),
    longitude: z.number(),
    timezone: z.string().optional(),
    hourly: z
      .object({
        time: z.array(z.string().regex(HOUR_RE)).min(1),
        temperature_2m: z.array(nullableNumber).optional(),
        apparent_temperature: z.array(nullableNumber).optional(),
        wind_speed_10m: z.array(nullableNumber).optional(),
        wind_gusts_10m: z.array(nullableNumber).optional(),
        wind_direction_10m: z.array(nullableNumber).optional(),
        relative_humidity_2m: z.array(nullableNumber).optional(),
        precipitation: z.array(nullableNumber).optional(),
        precipitation_probability: z.array(nullableNumber).optional(),
        cloud_cover: z.array(nullableNumber).optional(),
        pressure_msl: z.array(nullableNumber).optional(),
        visibility: z.array(nullableNumber).optional(),
        weather_code: z.array(nullableNumber).optional()
      })
      .optional(),
    daily: z
      .object({
        time: z.array(z.string().regex(DAY_RE)).optional(),
        sunrise: z.array(z.union([z.string().regex(HOUR_RE), z.null()])).optional(),
        sunset: z.array(z.union([z.string().regex(HOUR_RE), z.null()])).optional(),
        uv_index_max: z.array(nullableNumber).optional()
      })
      .optional()
  })
  .passthrough();

export type ForecastResponse = z.infer<typeof forecastResponseSchema>;

export const FORECAST_HOST = 'https://api.open-meteo.com/v1/forecast';

// NOTE: there is no `thunderstorm` variable in the Open-Meteo Forecast API
// (verified 2026-10-11: the API rejects it). The internal `thunderstorm`
// field is DERIVED from the WMO weather_code (>= 95 = thunderstorm).
const HOURLY_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'relative_humidity_2m',
  'precipitation',
  'precipitation_probability',
  'cloud_cover',
  'pressure_msl',
  'visibility',
  'weather_code'
] as const;

const DAILY_VARS = ['sunrise', 'sunset', 'uv_index_max'] as const;

export function buildForecastUrl(
  location: Pick<ForecastLocation, 'latitude' | 'longitude'>,
  days: number
): string {
  const params = new URLSearchParams();
  params.set('latitude', String(location.latitude));
  params.set('longitude', String(location.longitude));
  params.set('hourly', HOURLY_VARS.join(','));
  params.set('daily', DAILY_VARS.join(','));
  params.set('forecast_days', String(days));
  params.set('timezone', 'auto');
  return `${FORECAST_HOST}?${params.toString()}`;
}

const METADATA: ProviderMetadata = {
  provider: 'Open-Meteo Forecast API',
  endpoint: 'https://api.open-meteo.com/v1/forecast',
  license: 'CC BY 4.0 (non-commercial, <10k calls/day)',
  attribution: 'Weather data © Open-Meteo.com'
};

function pick(arr: (number | null)[] | undefined, i: number): number | null {
  if (!arr) return null;
  const v = arr[i];
  return v == null ? null : v;
}

/** Map a validated raw response into the internal WeatherForecast shape. */
export function parseForecastResponse(
  raw: unknown,
  location: ForecastLocation,
  fetchedAt: string
): WeatherForecast {
  const parsed = forecastResponseSchema.parse(raw);
  const hours: WeatherHour[] = [];
  const times = parsed.hourly?.time ?? [];
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (!t) continue;
    const code = pick(parsed.hourly?.weather_code, i);
    hours.push({
      time: t,
      temperature: pick(parsed.hourly?.temperature_2m, i),
      apparentTemperature: pick(parsed.hourly?.apparent_temperature, i),
      windSpeed: pick(parsed.hourly?.wind_speed_10m, i),
      windGusts: pick(parsed.hourly?.wind_gusts_10m, i),
      windDirection: pick(parsed.hourly?.wind_direction_10m, i),
      precipitation: pick(parsed.hourly?.precipitation, i),
      precipitationProbability: pick(parsed.hourly?.precipitation_probability, i),
      cloudCover: pick(parsed.hourly?.cloud_cover, i),
      pressureMsl: pick(parsed.hourly?.pressure_msl, i),
      humidity: pick(parsed.hourly?.relative_humidity_2m, i),
      // Provider returns visibility in METRES; internal unit is km.
      visibility: (() => {
        const v = pick(parsed.hourly?.visibility, i);
        return v == null ? null : v / 1000;
      })(),
      weatherCode: code,
      // Derived indicator: WMO 95/96/99 = thunderstorm (with/without hail).
      thunderstorm: code != null && code >= 95 ? 1 : 0
    });
  }

  const days: WeatherDay[] = [];
  const dates = parsed.daily?.time ?? [];
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    if (!d) continue;
    const sun = parsed.daily?.sunrise?.[i];
    const set = parsed.daily?.sunset?.[i];
    days.push({
      date: d,
      sunrise: sun ?? null,
      sunset: set ?? null,
      uvIndexMax: pick(parsed.daily?.uv_index_max, i)
    });
  }

  return {
    location,
    hours,
    days,
    timezone: parsed.timezone ?? location.timezone ?? 'auto',
    fetchedAt,
    source: METADATA
  };
}

/** Fetch atmospheric forecast. Throws ProviderError on failure. */
export async function fetchWeather(
  location: ForecastLocation,
  days = 3
): Promise<WeatherForecast> {
  const url = buildForecastUrl(location, days);
  const { data, fetchedAt } = await fetchJson(url);
  return parseForecastResponse(data, location, fetchedAt);
}
