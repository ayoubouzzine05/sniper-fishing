/**
 * Open-Meteo Marine API adapter.
 *
 * Docs: https://open-meteo.com/en/docs/marine-weather-api
 * License: CC BY 4.0, non-commercial use, <10,000 calls/day (attribution
 * required — we show it in the UI).
 *
 * Known limitations (documented by the provider, surfaced in the UI):
 *  - 5 km grid; coastal accuracy is limited.
 *  - Tides / sea level / ocean currents are ~8 km model estimates — NOT a
 *    tide table, NOT for navigation.
 *  - Not every variable is available everywhere (coast of Morocco included):
 *    we request everything and treat missing fields as null.
 */
import { z } from 'zod';
import { fetchJson } from '../http';
import type { ForecastLocation, MarineForecast, MarineHour, ProviderMetadata } from '@/lib/models/types';

const HOUR_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const nullableNumber = z.number().nullable();

const marineResponseSchema = z
  .object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    timezone: z.string().optional(),
    // `hourly` is REQUIRED: a valid marine forecast always contains it.
    // A response without hourly is malformed and must fail loudly rather
    // than being silently shown as "no data".
    hourly: z
      .object({
        time: z.array(z.string().regex(HOUR_RE)).min(1),
        wave_height: z.array(nullableNumber).optional(),
        wave_direction: z.array(nullableNumber).optional(),
        wave_period: z.array(nullableNumber).optional(),
        wave_peak_period: z.array(nullableNumber).optional(),
        wind_wave_height: z.array(nullableNumber).optional(),
        wind_wave_direction: z.array(nullableNumber).optional(),
        wind_wave_period: z.array(nullableNumber).optional(),
        swell_wave_height: z.array(nullableNumber).optional(),
        swell_wave_direction: z.array(nullableNumber).optional(),
        swell_wave_period: z.array(nullableNumber).optional(),
        sea_surface_temperature: z.array(nullableNumber).optional(),
        ocean_current_velocity: z.array(nullableNumber).optional(),
        ocean_current_direction: z.array(nullableNumber).optional(),
        sea_level_height_msl: z.array(nullableNumber).optional()
      })
  })
  .passthrough();

export type MarineResponse = z.infer<typeof marineResponseSchema>;

const VARS = [
  'wave_height',
  'wave_direction',
  'wave_period',
  'wave_peak_period',
  'wind_wave_height',
  'wind_wave_direction',
  'wind_wave_period',
  'swell_wave_height',
  'swell_wave_direction',
  'swell_wave_period',
  'sea_surface_temperature',
  'ocean_current_velocity',
  'ocean_current_direction',
  'sea_level_height_msl'
] as const;

/**
 * Both hosts are documented by Open-Meteo; we try the primary first and fall
 * back to the alternate if the network path to the primary fails.
 */
export const MARINE_HOSTS = [
  'https://marine-api.open-meteo.com/v1/marine',
  'https://marine.open-meteo.com/v1/marine'
];

export function buildMarineUrl(
  host: string,
  location: Pick<ForecastLocation, 'latitude' | 'longitude'>,
  days: number
): string {
  const params = new URLSearchParams();
  params.set('latitude', String(location.latitude));
  params.set('longitude', String(location.longitude));
  params.set('hourly', VARS.join(','));
  params.set('forecast_days', String(days));
  params.set('timezone', 'auto');
  return `${host}?${params.toString()}`;
}

const METADATA: ProviderMetadata = {
  provider: 'Open-Meteo Marine API',
  endpoint: 'https://marine.open-meteo.com/v1/marine',
  license: 'CC BY 4.0 (non-commercial, <10k calls/day)',
  attribution: 'Wave & ocean data © Open-Meteo.com'
};

function pick(arr: (number | null)[] | undefined, i: number): number | null {
  if (!arr) return null;
  const v = arr[i];
  return v == null ? null : v;
}

/** Map a validated raw response into the internal MarineForecast shape. */
export function parseMarineResponse(
  raw: unknown,
  location: ForecastLocation,
  fetchedAt: string
): MarineForecast {
  const parsed = marineResponseSchema.parse(raw);
  const hours: MarineHour[] = [];
  const times = parsed.hourly?.time ?? [];
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (!t) continue;
    hours.push({
      time: t,
      waveHeight: pick(parsed.hourly?.wave_height, i),
      waveDirection: pick(parsed.hourly?.wave_direction, i),
      wavePeriod: pick(parsed.hourly?.wave_period, i),
      wavePeakPeriod: pick(parsed.hourly?.wave_peak_period, i),
      windWaveHeight: pick(parsed.hourly?.wind_wave_height, i),
      windWaveDirection: pick(parsed.hourly?.wind_wave_direction, i),
      windWavePeriod: pick(parsed.hourly?.wind_wave_period, i),
      swellWaveHeight: pick(parsed.hourly?.swell_wave_height, i),
      swellWaveDirection: pick(parsed.hourly?.swell_wave_direction, i),
      swellWavePeriod: pick(parsed.hourly?.swell_wave_period, i),
      seaSurfaceTemperature: pick(parsed.hourly?.sea_surface_temperature, i),
      oceanCurrentVelocity: pick(parsed.hourly?.ocean_current_velocity, i),
      oceanCurrentDirection: pick(parsed.hourly?.ocean_current_direction, i),
      seaLevelHeightMsl: pick(parsed.hourly?.sea_level_height_msl, i)
    });
  }
  return {
    location,
    hours,
    timezone: parsed.timezone ?? location.timezone ?? 'auto',
    fetchedAt,
    source: METADATA
  };
}

/** Fetch marine data with host fallback. Throws ProviderError on failure. */
export async function fetchMarine(
  location: ForecastLocation,
  days = 3
): Promise<MarineForecast> {
  let lastError: unknown = null;
  for (const host of MARINE_HOSTS) {
    const url = buildMarineUrl(host, location, days);
    try {
      const { data, fetchedAt } = await fetchJson(url);
      return parseMarineResponse(data, location, fetchedAt);
    } catch (e) {
      lastError = e;
      // Only fall through on network/timeout/http errors, not parse errors
      // (a parse error means the provider itself changed contract).
      const isNetwork = e instanceof Error && !e.name.startsWith('Zod');
      if (!isNetwork) throw e;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('All marine providers failed');
}
