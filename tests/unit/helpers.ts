/**
 * Shared test helpers.
 */
import type { ConditionSnapshot } from '@/lib/models/types';

/** Build a ConditionSnapshot with sane defaults; override per test. */
export function makeSnapshot(overrides: Partial<ConditionSnapshot> = {}): ConditionSnapshot {
  return {
    time: '2026-10-11T08:00',
    windSpeed: 10,
    windGusts: 18,
    windDirection: 90,
    waveHeight: 0.5,
    waveDirection: 270,
    wavePeriod: 6,
    swellHeight: 0.4,
    swellDirection: 260,
    swellPeriod: 8,
    seaSurfaceTemperature: 19,
    oceanCurrentVelocity: 2,
    oceanCurrentDirection: 120,
    seaLevelHeightMsl: 0.3,
    temperature: 20,
    apparentTemperature: 19,
    precipitation: 0,
    precipitationProbability: 5,
    cloudCover: 30,
    pressureMsl: 1015,
    humidity: 65,
    visibility: 30,
    weatherCode: 2,
    thunderstorm: 0,
    isDaylight: true,
    dataCompleteness: 1,
    missing: [],
    ...overrides
  };
}

/** Build N hourly snapshots starting at the given wall time (1h step). */
export function makeHourlySeries(
  n: number,
  startWall: string,
  perHour?: (i: number) => Partial<ConditionSnapshot>
): ConditionSnapshot[] {
  const [d, t] = startWall.split('T');
  const out: ConditionSnapshot[] = [];
  for (let i = 0; i < n; i++) {
    const minutes = Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) + i * 60;
    const dayOffset = Math.floor(minutes / 1440);
    const hh = String(Math.floor((minutes % 1440) / 60)).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    const date = new Date(`${d}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    const dateStr = date.toISOString().slice(0, 10);
    out.push(makeSnapshot({ time: `${dateStr}T${hh}:${mm}`, ...(perHour?.(i) ?? {}) }));
  }
  return out;
}
