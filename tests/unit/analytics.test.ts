/**
 * Logbook analytics tests (user's own records only).
 * Verifies the honesty rules: counts derive only from the user's sessions
 * and group comparisons below MIN_SAMPLES_FOR_COMPARISON are flagged.
 */
import { describe, it, expect } from 'vitest';
import {
  sessionsPerMonth,
  catchBySpecies,
  totalCatchRate,
  resultsByMethod,
  resultsByLocation,
  baitPerformance,
  successfulSessionConditions,
  sessionDurationHours,
  MIN_SAMPLES_FOR_COMPARISON
} from '@/lib/logbook/analytics';
import type { FishingSession } from '@/lib/models/types';

function sess(overrides: Partial<FishingSession>): FishingSession {
  return {
    id: 'x',
    date: '2026-10-05',
    startTime: '07:00',
    endTime: '09:00',
    location: { id: 't', name: 'Tangier', latitude: 35.7, longitude: -5.8 },
    spotId: null,
    method: 'surfcasting',
    targetSpecies: [],
    baitOrLure: '',
    equipmentNotes: '',
    notes: '',
    conditions: null,
    catches: [
      { id: 'c1', species: 'sea bream', weightGrams: 1000, lengthCm: 40, kept: true, note: '', photoDataUrl: null }
    ],
    photos: [],
    createdAt: '2026-10-05T10:00:00Z',
    updatedAt: '2026-10-05T10:00:00Z',
    ...overrides
  };
}

describe('analytics', () => {
  const A = sess({ id: 'A', date: '2026-09-01', method: 'surfcasting', baitOrLure: 'shad' });
  const B = sess({ id: 'B', date: '2026-10-02', method: 'shore_spinning', baitOrLure: 'plug', catches: [] });
  const C = sess({ id: 'C', date: '2026-10-20', method: 'surfcasting', baitOrLure: 'shad', location: { id: 'r', name: 'Ras Tiflet', latitude: 35.75, longitude: -5.84 } });
  const sessions = [A, B, C];

  it('sessionsPerMonth buckets by local month and counts fish', () => {
    const m = sessionsPerMonth(sessions);
    expect(m).toHaveLength(2);
    expect(m[0]).toEqual({ month: '2026-09', sessions: 1, fish: 1 });
    expect(m[1]).toEqual({ month: '2026-10', sessions: 2, fish: 1 });
  });

  it('catchBySpecies aggregates count and total grams', () => {
    const bySp = catchBySpecies(sessions);
    expect(bySp).toHaveLength(1);
    expect(bySp[0]).toMatchObject({ species: 'sea bream', count: 2, totalWeightGrams: 2000 });

    // Null weights stay null (no fabricated grams).
    const noWeights = [
      sess({ id: 'N1', catches: [{ id: 'c', species: 'tuna', weightGrams: null, lengthCm: 100, kept: true, note: '', photoDataUrl: null }] })
    ];
    expect(catchBySpecies(noWeights)[0]).toMatchObject({ species: 'tuna', totalWeightGrams: null });
  });

  it('totalCatchRate = fish / fishing hours (rounded to 1 decimal)', () => {
    const { fish, hours, perHour } = totalCatchRate(sessions);
    expect(fish).toBe(2);
    expect(hours).toBeCloseTo(6, 5);
    expect(perHour).toBe(0.3); // 2/6 rounded
  });

  it('handles overnight sessions in duration math', () => {
    const overnight = sess({ id: 'O', startTime: '22:00', endTime: '02:00' });
    expect(sessionDurationHours(overnight)).toBe(4);
  });

  it('resultsByMethod / resultsByLocation report sessions, fish and zero-catch counts', () => {
    const byMethod = resultsByMethod(sessions);
    const surf = byMethod.find((x) => x.key === 'surfcasting');
    const spin = byMethod.find((x) => x.key === 'shore_spinning');
    expect(surf).toMatchObject({ key: 'surfcasting', sessions: 2, fish: 2, zeroCatchSessions: 0 });
    expect(spin).toMatchObject({ key: 'shore_spinning', sessions: 1, fish: 0, zeroCatchSessions: 1 });

    const byLoc = resultsByLocation(sessions);
    expect(byLoc.find((x) => x.key === 'Tangier')?.sessions).toBe(2);
    expect(byLoc.find((x) => x.key === 'Ras Tiflet')?.sessions).toBe(1);
  });

  it('baitPerformance groups by bait and flags insufficient samples (< 3)', () => {
    const bait = baitPerformance(sessions);
    const shad = bait.find((b) => b.key === 'shad');
    expect(shad?.sessions).toBe(2);
    expect(shad?.sessions).toBeLessThan(MIN_SAMPLES_FOR_COMPARISON);

    const plenty = [A, C, sess({ id: 'E', date: '2026-10-22', baitOrLure: 'Shad', catches: [] })];
    const plentyBait = baitPerformance(plenty);
    expect(plentyBait.find((b) => b.key === 'shad')?.sessions).toBe(3);
  });

  it('successfulSessionConditions averages ONLY sessions with at least one fish', () => {
    const withS = sess({
      id: 'F',
      date: '2026-10-23',
      catches: [
        { id: 'c1', species: 'sea bream', weightGrams: 500, lengthCm: 30, kept: true, note: '', photoDataUrl: null }
      ],
      conditions: {
        windSpeed: 12,
        windGusts: 18,
        waveHeight: 0.6,
        precipitation: 0,
        temperature: 21,
        weatherCode: 1,
        capturedAt: '2026-10-23T07:00:00Z',
        source: 'Open-Meteo'
      }
    });
    const res = successfulSessionConditions([A, B, withS]);
    // A and F have fish (2 sessions); B is zero-catch and excluded.
    expect(res.samples).toBe(2);
    // A has no condition snapshot → the average is over the present values only.
    expect(res.avgWind).toBe(12);
    expect(res.avgWave).toBe(0.6);
    expect(res.avgRain).toBe(0); // A null + withS 0 → avg of [0]
  });

  it('returns null averages when no successful session has condition data', () => {
    const res = successfulSessionConditions([sess({ id: 'G' })]); // A-like: no conditions
    expect(res.samples).toBe(1);
    expect(res.avgWind).toBeNull();
    expect(res.avgWave).toBeNull();
    expect(res.avgRain).toBeNull();
  });
});
