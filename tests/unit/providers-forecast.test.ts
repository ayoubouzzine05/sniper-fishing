/**
 * Open-Meteo Forecast adapter tests (real captured fixture, Tangier
 * 2026-10-11) + unit conversion of visibility (provider m → internal km)
 * + derived thunderstorm indicator from WMO code.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  parseForecastResponse,
  buildForecastUrl,
  FORECAST_HOST
} from '@/lib/providers/open-meteo/forecast';
import type { ForecastLocation } from '@/lib/models/types';

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../fixtures/forecast-tangier.json'), 'utf8')
) as Record<string, unknown>;

const LOC: ForecastLocation = {
  id: 'geo_tangier',
  name: 'Tangier',
  latitude: 35.7595,
  longitude: -5.834
};

describe('buildForecastUrl', () => {
  it('requests documented variables only (no thunderstorm — API rejects it)', () => {
    const url = buildForecastUrl(LOC, 3);
    expect(url.startsWith(FORECAST_HOST)).toBe(true);
    expect(url).toContain('wind_gusts_10m');
    expect(url).toContain('precipitation_probability');
    expect(url).toContain('visibility');
    expect(url).not.toContain('thunderstorm');
    expect(url).toContain('sunrise');
  });
});

describe('parseForecastResponse (real captured fixture)', () => {
  it('maps hours, days and real values', () => {
    const wf = parseForecastResponse(fixture, LOC, '2026-10-11T06:30:00Z');
    expect(wf.hours.length).toBe(48);
    // Real values from the 2026-10-11 capture:
    expect(wf.hours[0]!.windSpeed).toBeCloseTo(9.7, 1);
    expect(wf.hours[0]!.windGusts).toBeCloseTo(22, 1);
    expect(wf.days[0]!.sunrise).toBe('2026-10-11T07:26');
    expect(wf.timezone).toBe('Africa/Casablanca');
  });

  it('converts visibility from provider metres to internal km', () => {
    const wf = parseForecastResponse(fixture, LOC, '2026-10-11T06:30:00Z');
    const v0 = wf.hours[0]!.visibility;
    expect(v0).not.toBeNull();
    expect(v0!).toBeCloseTo(33.02, 2); // 33020 m → 33.02 km
  });

  it('derives thunderstorm indicator from WMO code', () => {
    const wf = parseForecastResponse(fixture, LOC, '2026-10-11T06:30:00Z');
    expect(wf.hours[0]!.thunderstorm).toBe(0); // code 2 → no thunder

    const stormFixture = JSON.parse(JSON.stringify(fixture)) as {
      hourly: { weather_code: (number | null)[] };
    };
    stormFixture.hourly.weather_code = stormFixture.hourly.weather_code.map(() => 95);
    const wf2 = parseForecastResponse(stormFixture, LOC, '2026-10-11T06:30:00Z');
    expect(wf2.hours[0]!.thunderstorm).toBe(1);
  });

  it('keeps null where the provider has no value', () => {
    const partial = JSON.parse(JSON.stringify(fixture)) as {
      hourly: Record<string, (number | null)[]>;
    };
    partial.hourly.visibility = partial.hourly.visibility.map(() => null);
    const wf = parseForecastResponse(partial, LOC, '2026-10-11T06:30:00Z');
    expect(wf.hours[0]!.visibility).toBeNull();
  });

  it('rejects malformed shapes', () => {
    expect(() => parseForecastResponse({ nope: true }, LOC, 'x')).toThrow();
    expect(() =>
      parseForecastResponse({ latitude: 1, longitude: 2, hourly: { time: ['nope'] } }, LOC, 'x')
    ).toThrow();
  });
});
