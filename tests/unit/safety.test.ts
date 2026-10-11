/**
 * Safety assessment tests: thresholds, severity escalation, insufficient
 * data, method strictness (kayak), official warning override, and the
 * doNotGoOut contract that must never be overridden by fishing scores.
 */
import { describe, it, expect } from 'vitest';
import { assessSafety, SAFETY_THRESHOLDS } from '@/lib/safety/assess';
import type { FishingMethod, MarineWarning } from '@/lib/models/types';
import { makeSnapshot, makeHourlySeries } from './helpers';

const NOW = '2026-10-11T07:00:00.000Z';

function assess(method: FishingMethod, overrides: Partial<ReturnType<typeof makeSnapshot>> = {}, warnings: MarineWarning[] = []) {
  const hours = makeHourlySeries(4, '2026-10-11T08:00', () => overrides);
  return assessSafety({ hours, method, warnings, nowIso: NOW });
}

describe('safety assessment', () => {
  it('calm daytime conditions are favorable for shore methods', () => {
    const a = assess('surfcasting', { windSpeed: 8, windGusts: 15, waveHeight: 0.4, swellHeight: 0.3, precipitation: 0, visibility: 30 });
    expect(a.status).toBe('favorable');
    expect(a.doNotGoOut).toBe(false);
  });

  it('strong wind escalates caution → unfavorable → dangerous', () => {
    const kayak = assess('kayak', { windSpeed: 22, waveHeight: 0.6 });
    expect(kayak.status).toBe('caution');

    const kayakBad = assess('kayak', { windSpeed: 32, waveHeight: 1.0 });
    expect(kayakBad.status).toBe('unfavorable');
    expect(kayakBad.doNotGoOut).toBe(true);

    const kayakDanger = assess('kayak', { windSpeed: 45, waveHeight: 2.0 });
    expect(kayakDanger.status).toBe('dangerous');
    expect(kayakDanger.doNotGoOut).toBe(true);
  });

  it('kayak thresholds are strictly tighter than surfcasting for the same weather', () => {
    const method: FishingMethod = 'kayak';
    const surf: FishingMethod = 'surfcasting';
    for (const key of ['windCaution', 'windUnfavorable', 'windDangerous'] as const) {
      expect(SAFETY_THRESHOLDS[method][key]).toBeLessThan(SAFETY_THRESHOLDS[surf][key]);
    }
  });

  it('dangerous gusts force doNotGoOut even if mean wind is moderate', () => {
    const a = assess('harbor', { windSpeed: 20, windGusts: 80 });
    expect(a.status).toBe('dangerous');
    expect(a.doNotGoOut).toBe(true);
  });

  it('thunderstorm is always dangerous', () => {
    const a = assess('harbor', { windSpeed: 10, waveHeight: 0.2, thunderstorm: 1 });
    expect(a.status).toBe('dangerous');
    expect(a.alerts.some((x) => x.key === 'aThunderstorm')).toBe(true);
  });

  it('heavy rain is unfavorable', () => {
    const a = assess('surfcasting', { windSpeed: 10, waveHeight: 0.3, precipitation: 15 });
    expect(a.status).toBe('unfavorable');
  });

  it('low visibility triggers caution/unfavorable (kayak thresholds: 3 km / 1.5 km)', () => {
    const a = assess('kayak', { windSpeed: 10, waveHeight: 0.3, visibility: 2.5 });
    expect(a.status).toBe('caution');
    expect(a.alerts.some((x) => x.key === 'aVisCaution')).toBe(true);
    const b = assess('kayak', { windSpeed: 10, waveHeight: 0.3, visibility: 0.5 });
    expect(b.status).toBe('unfavorable');
    expect(b.alerts.some((x) => x.key === 'aVisUnfavorable')).toBe(true);
    // Missing visibility never invents an alert.
    const c = assess('kayak', { windSpeed: 10, waveHeight: 0.3, visibility: null });
    expect(c.alerts.filter((x) => x.key.startsWith('aVis'))).toEqual([]);
  });

  it('night is caution for night-sensitive methods only', () => {
    const kayakNight = assess('kayak', { windSpeed: 10, waveHeight: 0.3, isDaylight: false });
    expect(kayakNight.alerts.some((x) => x.key === 'aNight')).toBe(true);

    const surfNight = assess('surfcasting', { windSpeed: 10, waveHeight: 0.3, isDaylight: false });
    expect(surfNight.alerts.some((x) => x.key === 'aNight')).toBe(false);
  });

  it('official warnings outrank everything (dangerous when severity=warning)', () => {
    const warning: MarineWarning = {
      id: 'w1',
      area: 'Tangier',
      message: 'Gale warning',
      issuedAt: NOW,
      severity: 'warning',
      official: true,
      source: { provider: 'test', endpoint: '', license: '', attribution: '' }
    };
    const a = assessSafety({
      hours: makeHourlySeries(4, '2026-10-11T08:00'),
      method: 'surfcasting',
      warnings: [warning],
      nowIso: NOW
    });
    expect(a.status).toBe('dangerous');
    expect(a.doNotGoOut).toBe(true);
    expect(a.alerts.some((x) => x.official)).toBe(true);
  });

  it('insufficient data: <50% completeness → insufficient_data (no alerts invented)', () => {
    const a = assessSafety({
      hours: makeHourlySeries(4, '2026-10-11T08:00', () => ({
        windSpeed: null,
        windGusts: null,
        waveHeight: null,
        swellHeight: null,
        precipitation: null,
        temperature: null,
        visibility: null,
        dataCompleteness: 0
      })),
      method: 'surfcasting',
      warnings: [],
      nowIso: NOW
    });
    expect(a.status).toBe('insufficient_data');
    expect(a.doNotGoOut).toBe(false);
  });

  it('session-level: uses the worst hour (not the average)', () => {
    // Calm first half, storm in the second half of the session.
    const hours = makeHourlySeries(6, '2026-10-11T08:00', (i) =>
      i >= 4
        ? { windSpeed: 55, windGusts: 70, waveHeight: 2.5, precipitation: 12, visibility: 1 }
        : { windSpeed: 8, windGusts: 12, waveHeight: 0.3, precipitation: 0, visibility: 30 }
    );
    const a = assessSafety({ hours, method: 'surfcasting', warnings: [], nowIso: NOW });
    expect(['unfavorable', 'dangerous']).toContain(a.status);
    expect(a.doNotGoOut).toBe(true);
  });
});
