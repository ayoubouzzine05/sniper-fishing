/**
 * Merge tests: marine+weather union, completeness, nearest-now snapshot,
 * timezone-safe wall clock.
 */
import { describe, it, expect } from 'vitest';
import { mergeForecasts, snapshotNearestNow, wallClockNowInTimezone } from '@/lib/providers/merge';
import type {
  ConditionSnapshot,
  ForecastLocation,
  MarineForecast,
  WeatherForecast
} from '@/lib/models/types';

const LOC: ForecastLocation = { id: 't', name: 'Tangier', latitude: 35.76, longitude: -5.83, timezone: 'Africa/Casablanca' };

function makeMarine(times: string[], wave: (number | null)[]): MarineForecast {
  return {
    location: LOC,
    hours: times.map((time, i) => ({
      time,
      waveHeight: wave[i] ?? null,
      waveDirection: null,
      wavePeriod: null,
      wavePeakPeriod: null,
      windWaveHeight: null,
      windWaveDirection: null,
      windWavePeriod: null,
      swellWaveHeight: (wave[i] ?? null) != null ? (wave[i]! / 2) : null,
      swellWaveDirection: null,
      swellWavePeriod: null,
      seaSurfaceTemperature: null,
      oceanCurrentVelocity: null,
      oceanCurrentDirection: null,
      seaLevelHeightMsl: null
    })),
    timezone: 'Africa/Casablanca',
    fetchedAt: '2026-10-11T06:30:00Z',
    source: { provider: 'test', endpoint: '', license: '', attribution: '' }
  };
}

function makeWeather(times: string[], wind: (number | null)[]): WeatherForecast {
  return {
    location: LOC,
    hours: times.map((time, i) => ({
      time,
      temperature: 20,
      apparentTemperature: 19,
      windSpeed: wind[i] ?? null,
      windGusts: wind[i] != null ? 18 : null,
      windDirection: 90,
      precipitation: 0,
      precipitationProbability: 5,
      cloudCover: 30,
      pressureMsl: 1015,
      humidity: 65,
      visibility: 30,
      weatherCode: 2,
      thunderstorm: 0
    })),
    days: [{ date: '2026-10-11', sunrise: '2026-10-11T07:26', sunset: '2026-10-11T18:32', uvIndexMax: 6 }],
    timezone: 'Africa/Casablanca',
    fetchedAt: '2026-10-11T06:30:00Z',
    source: { provider: 'test', endpoint: '', license: '', attribution: '' }
  };
}

const TIMES = ['2026-10-11T07:00', '2026-10-11T08:00', '2026-10-11T09:00'];

describe('mergeForecasts', () => {
  it('unions times and carries both sources', () => {
    const marine = makeMarine(TIMES, [0.5, 0.6, null]);
    const weather = makeWeather(TIMES, [10, 12, 14]);
    const { hours, sunriseByDate } = mergeForecasts(marine, weather, LOC);
    expect(hours).toHaveLength(3);
    expect(hours[0]!.waveHeight).toBeCloseTo(0.5, 5);
    expect(hours[0]!.windSpeed).toBeCloseTo(10, 5);
    expect(hours[0]!.swellHeight).toBeCloseTo(0.25, 5);
    expect(sunriseByDate['2026-10-11']?.sunrise).toBe('2026-10-11T07:26');
  });

  it('completeness reflects missing keys; missing fields stay null', () => {
    const marine = makeMarine(TIMES, [0.5, null, 0.5]);
    const weather = makeWeather(TIMES, [10, null, 10]);
    const { hours } = mergeForecasts(marine, weather, LOC);
    // Hour 0: all 7 key fields present → 1.0
    expect(hours[0]!.dataCompleteness).toBeCloseTo(1, 5);
    expect(hours[0]!.missing).toEqual([]);
    // Hour 1: windSpeed, windGusts, waveHeight, swellHeight missing → 3/7
    expect(hours[1]!.dataCompleteness).toBeCloseTo(3 / 7, 5);
    expect(hours[1]!.waveHeight).toBeNull();
    expect(hours[1]!.windSpeed).toBeNull();
    expect(hours[1]!.swellHeight).toBeNull();
    expect(hours[1]!.missing.sort()).toEqual(
      ['swellHeight', 'windGusts', 'windSpeed', 'waveHeight'].sort()
    );
    // precipitation (0) is a PRESENT value, never "missing".
    expect(hours[1]!.missing).not.toContain('precipitation');
  });

  it('works with only one provider (graceful degradation)', () => {
    const marine = makeMarine(TIMES, [0.5, 0.5, 0.5]);
    const { hours } = mergeForecasts(marine, null, LOC);
    expect(hours).toHaveLength(3);
    expect(hours[0]!.windSpeed).toBeNull();
    expect(hours[0]!.waveHeight).toBeCloseTo(0.5, 5);
    expect(hours[0]!.dataCompleteness).toBeLessThan(1);
  });

  it('isDaylight follows the location sunrise/sunset wall times', () => {
    const marine = makeMarine(TIMES, [0.5, 0.5, 0.5]);
    const weather = makeWeather(TIMES, [10, 10, 10]);
    const { hours } = mergeForecasts(marine, weather, LOC);
    // 07:00 is before 07:26 sunrise → night.
    expect(hours[0]!.isDaylight).toBe(false);
    expect(hours[1]!.isDaylight).toBe(true);
    expect(hours[2]!.isDaylight).toBe(true);
  });
});

describe('snapshotNearestNow', () => {
  it('picks the nearest hour to now', () => {
    const marine = makeMarine(TIMES, [0.5, 0.6, 0.7]);
    const weather = makeWeather(TIMES, [10, 11, 12]);
    const { hours } = mergeForecasts(marine, weather, LOC);
    const snap = snapshotNearestNow(hours, '2026-10-11T07:35');
    expect(snap?.time).toBe('2026-10-11T08:00');
    expect(snapshotNearestNow([], '2026-10-11T07:35')).toBeNull();
  });
});

describe('wallClockNowInTimezone', () => {
  it('computes the local wall clock in a given IANA timezone', () => {
    // 2026-10-11T05:00:00Z = 06:00 in Africa/Casablanca (UTC+1)
    expect(wallClockNowInTimezone('Africa/Casablanca', '2026-10-11T05:00:00Z')).toBe('2026-10-11T06:00');
    // UTC
    expect(wallClockNowInTimezone('UTC', '2026-10-11T05:00:00Z')).toBe('2026-10-11T05:00');
  });

  it('rolls over the day at midnight (no 25th hour)', () => {
    // 2026-10-10T23:00:00Z = 2026-10-11T00:00 in Africa/Casablanca (UTC+1).
    expect(wallClockNowInTimezone('Africa/Casablanca', '2026-10-10T23:00:00Z')).toBe('2026-10-11T00:00');
  });
});
