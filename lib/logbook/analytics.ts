/**
 * Logbook analytics — pure functions over the user's own records.
 *
 * HONESTY RULES (enforced by the UI):
 *  - All numbers derive ONLY from the user's sessions.
 *  - Group comparisons with fewer than 3 samples are flagged
 *    "insufficient samples" (see `MIN_SAMPLES_FOR_COMPARISON`).
 *  - The "conditions when you caught fish" view is explicitly a correlation,
 *    never a causal claim.
 */
import type { FishingSession } from '@/lib/models/types';

export const MIN_SAMPLES_FOR_COMPARISON = 3;

export interface MonthBucket {
  month: string; // YYYY-MM
  sessions: number;
  fish: number;
}

export interface SpeciesBucket {
  species: string;
  count: number;
  totalWeightGrams: number | null;
}

export interface GroupBucket {
  key: string;
  sessions: number;
  fish: number;
  zeroCatchSessions: number;
}

export interface ConditionSummary {
  samples: number;
  avgWind: number | null;
  avgWave: number | null;
  avgRain: number | null;
}

export function sessionDurationHours(s: FishingSession): number {
  const [sh, sm] = s.startTime.split(':').map(Number);
  const [eh, em] = s.endTime.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // overnight session
  return Math.min(24, Math.max(0, mins / 60));
}

export function sessionsPerMonth(sessions: FishingSession[]): MonthBucket[] {
  const map = new Map<string, MonthBucket>();
  for (const s of sessions) {
    const month = s.date.slice(0, 7);
    const b = map.get(month) ?? { month, sessions: 0, fish: 0 };
    b.sessions++;
    b.fish += s.catches.length;
    map.set(month, b);
  }
  return [...map.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
}

export function catchBySpecies(sessions: FishingSession[]): SpeciesBucket[] {
  const map = new Map<string, SpeciesBucket>();
  for (const s of sessions) {
    for (const c of s.catches) {
      const name = c.species.trim().toLowerCase();
      const b = map.get(name) ?? { species: c.species.trim(), count: 0, totalWeightGrams: null };
      b.count++;
      if (c.weightGrams != null) b.totalWeightGrams = (b.totalWeightGrams ?? 0) + c.weightGrams;
      map.set(name, b);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function totalCatchRate(sessions: FishingSession[]): {
  fish: number;
  hours: number;
  perHour: number | null;
} {
  const fish = sessions.reduce((a, s) => a + s.catches.length, 0);
  const hours = Math.round(sessions.reduce((a, s) => a + sessionDurationHours(s), 0) * 10) / 10;
  return { fish, hours, perHour: hours > 0 ? Math.round((fish / hours) * 10) / 10 : null };
}

function byGroup(sessions: FishingSession[], key: (s: FishingSession) => string): GroupBucket[] {
  const map = new Map<string, GroupBucket>();
  for (const s of sessions) {
    const k = key(s) || '—';
    const b = map.get(k) ?? { key: k, sessions: 0, fish: 0, zeroCatchSessions: 0 };
    b.sessions++;
    b.fish += s.catches.length;
    if (s.catches.length === 0) b.zeroCatchSessions++;
    map.set(k, b);
  }
  return [...map.values()].sort((a, b) => b.fish - a.fish || b.sessions - a.sessions);
}

export function resultsByMethod(sessions: FishingSession[]): GroupBucket[] {
  return byGroup(sessions, (s) => s.method);
}

export function resultsByLocation(sessions: FishingSession[]): GroupBucket[] {
  return byGroup(sessions, (s) => s.location.name);
}

/** Bait/lure performance — only meaningful with >= MIN_SAMPLES_FOR_COMPARISON. */
export function baitPerformance(sessions: FishingSession[]): GroupBucket[] {
  const withBait = sessions.filter((s) => s.baitOrLure.trim().length > 0);
  return byGroup(withBait, (s) => s.baitOrLure.trim().toLowerCase());
}

/** Average conditions across sessions that had at least one fish. */
export function successfulSessionConditions(sessions: FishingSession[]): ConditionSummary {
  const successful = sessions.filter((s) => s.catches.length > 0);
  const winds = successful.map((s) => s.conditions?.windSpeed ?? null);
  const waves = successful.map((s) => s.conditions?.waveHeight ?? null);
  const rains = successful.map((s) => s.conditions?.precipitation ?? null);
  return {
    samples: successful.length,
    avgWind: avgNonNull(winds),
    avgWave: avgNonNull(waves),
    avgRain: avgNonNull(rains)
  };
}

function avgNonNull(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v != null);
  if (present.length === 0) return null;
  return Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 10) / 10;
}
