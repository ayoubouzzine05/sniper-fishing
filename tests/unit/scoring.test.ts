/**
 * Scoring engine tests: determinism, method differences, missing-data
 * penalty, staleness, weights, best windows, timezone-safe wall times.
 */
import { describe, it, expect } from 'vitest';
import { scoreHour, scoreSeries } from '@/lib/scoring/engine';
import { findBestWindows } from '@/lib/scoring/windows';
import { buildProfile } from '@/lib/models/profiles';
import { makeSnapshot, makeHourlySeries } from './helpers';

const NOW = '2026-10-11T07:00:00.000Z';
const FETCHED = '2026-10-11T06:30:00.000Z';
const SUNRISE = '2026-10-11T07:26';
const SUNSET = '2026-10-11T18:32';

describe('scoring engine', () => {
  it('is deterministic: same inputs → identical outputs', () => {
    const profile = buildProfile('surfcasting', 'generic');
    const input = {
      snapshot: makeSnapshot(),
      profile,
      sunrise: SUNRISE,
      sunset: SUNSET,
      fetchedAt: FETCHED,
      nowIso: NOW,
      tideMoving: null
    };
    const a = scoreHour(input);
    const b = scoreHour(input);
    expect(a).toEqual(b);
  });

  it('scores a calm morning higher than a stormy afternoon', () => {
    const profile = buildProfile('surfcasting', 'generic');
    const calm = scoreHour({
      snapshot: makeSnapshot({ windSpeed: 8, windGusts: 15, waveHeight: 0.4, swellHeight: 0.3, precipitation: 0, time: '2026-10-11T08:00' }),
      profile,
      sunrise: SUNRISE,
      sunset: SUNSET,
      fetchedAt: FETCHED,
      nowIso: NOW,
      tideMoving: null
    });
    const stormy = scoreHour({
      snapshot: makeSnapshot({ windSpeed: 55, windGusts: 75, waveHeight: 2.4, swellHeight: 2.0, precipitation: 12, visibility: 1.2, time: '2026-10-11T15:00' }),
      profile,
      sunrise: SUNRISE,
      sunset: SUNSET,
      fetchedAt: FETCHED,
      nowIso: NOW,
      tideMoving: null
    });
    expect(calm.score).toBeGreaterThan(stormy.score);
    expect(stormy.score).toBeLessThan(30);
  });

  it('penalizes missing data instead of assuming ideal conditions', () => {
    const profile = buildProfile('surfcasting', 'generic');
    const full = scoreHour({
      snapshot: makeSnapshot(),
      profile, sunrise: SUNRISE, sunset: SUNSET, fetchedAt: FETCHED, nowIso: NOW, tideMoving: null
    });
    const missing = scoreHour({
      snapshot: makeSnapshot({ windSpeed: null, waveHeight: null, swellHeight: null, visibility: null, precipitation: null }),
      profile, sunrise: SUNRISE, sunset: SUNSET, fetchedAt: FETCHED, nowIso: NOW, tideMoving: null
    });
    expect(missing.score).toBeLessThan(full.score);
    expect(missing.completeness).toBeLessThan(full.completeness);
    const missingFactors = missing.factors.filter((f) => !f.available);
    expect(missingFactors.length).toBeGreaterThanOrEqual(4);
    // Every missing factor must be below the neutral 0.5 (a penalty).
    for (const f of missingFactors) expect(f.score01).toBeLessThan(0.5);
  });

  it('reduces confidence for stale data', () => {
    const profile = buildProfile('surfcasting', 'generic');
    const fresh = scoreHour({
      snapshot: makeSnapshot(),
      profile, sunrise: SUNRISE, sunset: SUNSET, fetchedAt: '2026-10-11T06:50:00.000Z', nowIso: NOW, tideMoving: null
    });
    const stale = scoreHour({
      snapshot: makeSnapshot(),
      profile, sunrise: SUNRISE, sunset: SUNSET, fetchedAt: '2026-10-08T06:30:00.000Z', nowIso: NOW, tideMoving: null
    });
    expect(stale.score).toBeLessThan(fresh.score);
  });

  it('different methods use different profiles and produce different scores in the same weather', () => {
    // 25 km/h wind: fine-ish for surfcasting, bad for kayak.
    const snap = makeSnapshot({ windSpeed: 25, windGusts: 35 });
    const surf = scoreHour({ snapshot: snap, profile: buildProfile('surfcasting', 'generic'), sunrise: SUNRISE, sunset: SUNSET, fetchedAt: FETCHED, nowIso: NOW, tideMoving: null });
    const kayak = scoreHour({ snapshot: snap, profile: buildProfile('kayak', 'generic'), sunrise: SUNRISE, sunset: SUNSET, fetchedAt: FETCHED, nowIso: NOW, tideMoving: null });
    expect(kayak.score).toBeLessThan(surf.score);
  });

  it('regional presets are configurable and differ from generic', () => {
    const generic = buildProfile('surfcasting', 'generic');
    const atl = buildProfile('surfcasting', 'morocco_atlantic');
    const med = buildProfile('surfcasting', 'morocco_mediterranean');
    expect(atl.swell.poorAbove).toBeGreaterThan(generic.swell.poorAbove);
    expect(med.swell.poorAbove).toBeLessThan(generic.swell.poorAbove);
    expect(atl.label).toContain('heuristic');
  });

  it('daylight factor: dawn scores higher than midnight for shore methods', () => {
    const profile = buildProfile('shore_spinning', 'generic');
    const dawn = scoreHour({
      snapshot: makeSnapshot({ time: '2026-10-11T08:00' }),
      profile, sunrise: SUNRISE, sunset: SUNSET, fetchedAt: FETCHED, nowIso: NOW, tideMoving: null
    });
    const night = scoreHour({
      snapshot: makeSnapshot({ time: '2026-10-11T02:00', isDaylight: false }),
      profile, sunrise: SUNRISE, sunset: SUNSET, fetchedAt: FETCHED, nowIso: NOW, tideMoving: null
    });
    const dawnFactor = dawn.factors.find((f) => f.key === 'daylight');
    const nightFactor = night.factors.find((f) => f.key === 'daylight');
    if (!dawnFactor || !nightFactor) throw new Error('daylight factor missing from score');
    expect(dawnFactor.score01).toBeGreaterThan(nightFactor.score01);
    expect(dawn.score).toBeGreaterThan(night.score);
  });

  it('tide factor is ignored when no tide data exists (but penalized if enabled)', () => {
    const profile = buildProfile('rock', 'generic'); // tide.enabled = true
    const snap = makeSnapshot();
    const res = scoreHour({ snapshot: snap, profile, sunrise: SUNRISE, sunset: SUNSET, fetchedAt: FETCHED, nowIso: NOW, tideMoving: null });
    const tide = res.factors.find((f) => f.key === 'tide');
    expect(tide).toBeDefined();
    expect(tide?.available).toBe(false);
    expect(tide?.score01).toBeLessThan(0.5);
  });

  it('scoreSeries handles a multi-hour window and keeps wall times', () => {
    const hours = makeHourlySeries(8, '2026-10-11T05:00');
    const profile = buildProfile('surfcasting', 'generic');
    const sunriseByDate = { '2026-10-11': { sunrise: SUNRISE, sunset: SUNSET } };
    const out = scoreSeries(hours, profile, sunriseByDate, FETCHED, NOW);
    expect(out).toHaveLength(8);
    for (const h of out) {
      expect(h.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      expect(h.score).toBeGreaterThanOrEqual(0);
      expect(h.score).toBeLessThanOrEqual(100);
    }
  });
});

describe('best windows', () => {
  it('finds the strongest non-overlapping windows', () => {
    const hours = makeHourlySeries(12, '2026-10-11T05:00', (i) => {
      // Peak in hours 6–9 (index 1–4), bad in the second half.
      const stormy = i >= 6;
      return {
        windSpeed: stormy ? 50 : 8,
        windGusts: stormy ? 70 : 15,
        waveHeight: stormy ? 2.2 : 0.4,
        swellHeight: stormy ? 1.9 : 0.3,
        precipitation: stormy ? 10 : 0,
        visibility: stormy ? 1 : 30
      };
    });
    const profile = buildProfile('surfcasting', 'generic');
    const sunriseByDate = { '2026-10-11': { sunrise: SUNRISE, sunset: SUNSET } };
    const scores = scoreSeries(hours, profile, sunriseByDate, FETCHED, NOW);
    const windows = findBestWindows(scores, { minLengthHours: 2, maxWindows: 2 });
    expect(windows.length).toBeGreaterThan(0);
    // The best window must sit in the calm first half (05:00–11:00).
    expect(windows[0]!.start < '2026-10-11T11:00').toBe(true);
    // Non-overlap.
    if (windows.length === 2) {
      expect(windows[1]!.start >= windows[0]!.end).toBe(true);
    }
    // Windows carry a rounded average score in [0,100].
    for (const w of windows) {
      expect(w.avgScore).toBeGreaterThanOrEqual(0);
      expect(w.avgScore).toBeLessThanOrEqual(100);
    }
  });

  it('returns empty when the series is too short', () => {
    const hours = makeHourlySeries(1, '2026-10-11T05:00');
    const profile = buildProfile('surfcasting', 'generic');
    const scores = scoreSeries(hours, profile, { '2026-10-11': { sunrise: SUNRISE, sunset: SUNSET } }, FETCHED, NOW);
    expect(findBestWindows(scores, { minLengthHours: 2, maxWindows: 2 })).toEqual([]);
  });
});
