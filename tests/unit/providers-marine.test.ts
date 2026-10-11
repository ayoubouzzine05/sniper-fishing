/**
 * Open-Meteo Marine adapter tests.
 *
 * Fixtures are REAL API responses captured from
 * https://marine-api.open-meteo.com for Tangier, Morocco on 2026-10-11
 * (labeled as such — they are static test fixtures, not live data).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  parseMarineResponse,
  buildMarineUrl,
  fetchMarine,
  MARINE_HOSTS
} from '@/lib/providers/open-meteo/marine';
import { clearHttpCache, ProviderError } from '@/lib/providers/http';
import type { ForecastLocation } from '@/lib/models/types';

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../fixtures/marine-tangier.json'), 'utf8')
) as Record<string, unknown>;

const LOC: ForecastLocation = {
  id: 'geo_tangier',
  name: 'Tangier',
  latitude: 35.7595,
  longitude: -5.834
};

afterEach(() => {
  clearHttpCache();
  vi.unstubAllGlobals();
});

describe('buildMarineUrl', () => {
  it('includes coordinates, variables, days and timezone=auto', () => {
    const url = buildMarineUrl(MARINE_HOSTS[0]!, LOC, 3);
    expect(url).toContain('latitude=35.7595');
    expect(url).toContain('longitude=-5.834');
    expect(url).toContain('wave_height');
    expect(url).toContain('sea_surface_temperature');
    expect(url).toContain('ocean_current_velocity');
    expect(url).toContain('sea_level_height_msl');
    expect(url).toContain('forecast_days=3');
    expect(url).toContain('timezone=auto');
  });
});

describe('parseMarineResponse (real captured fixture)', () => {
  it('maps all hours and real values into the internal shape', () => {
    const mf = parseMarineResponse(fixture, LOC, '2026-10-11T06:30:00Z');
    expect(mf.hours.length).toBe(48);
    expect(mf.hours[0]!.time).toBe('2026-10-11T00:00');
    // Real values from the 2026-10-11 capture:
    expect(mf.hours[0]!.waveHeight).toBeCloseTo(0.52, 2);
    expect(mf.hours[0]!.seaSurfaceTemperature).toBeCloseTo(19.6, 1);
    expect(mf.timezone).toBe('Africa/Casablanca');
    expect(mf.source.attribution).toContain('Open-Meteo');
  });

  it('treats absent variables as null, never as 0 (no fabricated data)', () => {
    const stripped = JSON.parse(JSON.stringify(fixture)) as {
      hourly: Record<string, unknown>;
    };
    delete stripped.hourly.sea_level_height_msl;
    const mf = parseMarineResponse(stripped, LOC, '2026-10-11T06:30:00Z');
    for (const h of mf.hours) {
      expect(h.seaLevelHeightMsl).toBeNull();
    }
    // Meanwhile the other variables must still map real values.
    expect(mf.hours[0]!.waveHeight).toBeCloseTo(0.52, 2);
  });

  it('rejects invalid responses (wrong types) with a parse error', () => {
    expect(() => parseMarineResponse({ latitude: 'x', longitude: 1 }, LOC, NOW_STR)).toThrow();
    expect(() =>
      parseMarineResponse({ latitude: 1, longitude: 2, hourly: { time: ['bogus'] } }, LOC, NOW_STR)
    ).toThrow();
  });

  it('rejects responses without an hourly array', () => {
    expect(() => parseMarineResponse({ latitude: 1, longitude: 2 }, LOC, NOW_STR)).toThrow();
  });
});

describe('fetchMarine (network behavior)', () => {
  it('falls back to the second host when the first host fails', async () => {
    const fakeFetch = vi.fn(async (input: RequestInfo | URL) => {
      const u = String(input);
      if (u.includes('marine-api.open-meteo.com')) {
        throw new TypeError('fetch failed');
      }
      return new Response(JSON.stringify(fixture), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fakeFetch);

    const mf = await fetchMarine(LOC, 2);
    expect(mf.hours.length).toBeGreaterThan(0);
    // Host 1 is retried before giving up, then host 2 is tried.
    const urls = fakeFetch.mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toContain('marine-api.open-meteo.com');
    expect(urls[urls.length - 1]!).toContain('marine.open-meteo.com');
    expect(urls.some((u) => u.includes('marine-api.open-meteo.com'))).toBe(true);
    expect(urls.some((u) => u.includes('marine.open-meteo.com'))).toBe(true);
  });

  it('throws ProviderError when all hosts fail and there is no cache', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      })
    );
    await expect(fetchMarine(LOC, 2)).rejects.toBeInstanceOf(ProviderError);
  });

  it('serves stale cache when the live call fails (stale-while-error)', async () => {
    const { fetchJson } = await import('@/lib/providers/http');
    const url = buildMarineUrl(MARINE_HOSTS[0]!, LOC, 2);
    let fail = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        if (fail) throw new TypeError('down');
        return new Response(JSON.stringify(fixture), { status: 200 });
      })
    );
    // Seed the cache (TTL 0 → immediately stale, forcing the error path).
    await fetchJson(url, { cacheTtlMs: 0, retries: 0 });
    fail = true;
    const { data, fromCache, fetchedAt } = await fetchJson(url, { cacheTtlMs: 0, retries: 0 });
    expect(fromCache).toBe(true);
    expect(fetchedAt).toBeTruthy();
    expect((data as { hourly: unknown }).hourly).toBeDefined();
  });
});

const NOW_STR = '2026-10-11T06:30:00Z';
