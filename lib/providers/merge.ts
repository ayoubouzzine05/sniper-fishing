/**
 * Merges marine + atmospheric hourly data into ConditionSnapshot series.
 * Pure function (no network) → fully unit-testable.
 */
import type {
  ConditionSnapshot,
  MarineForecast,
  MergedForecast,
  WeatherForecast,
  ForecastLocation
} from '@/lib/models/types';
import { isDaylightAt } from '@/lib/geo/wind';

/**
 * Key variables used for the completeness metric. If a key is missing at an
 * hour, the snapshot is penalized (scoring + safety treat missing data as
 * "unknown", never as "fine").
 */
const KEY_FIELDS: (keyof ConditionSnapshot)[] = [
  'windSpeed',
  'windGusts',
  'waveHeight',
  'swellHeight',
  'precipitation',
  'temperature',
  'visibility'
];

function buildSunriseByDate(weather: WeatherForecast | null): MergedForecast['sunriseByDate'] {
  const out: MergedForecast['sunriseByDate'] = {};
  if (!weather) return out;
  for (const d of weather.days) {
    out[d.date] = { sunrise: d.sunrise, sunset: d.sunset };
  }
  return out;
}

/** Merge two provider forecasts (either may be null) into hourly snapshots. */
export function mergeForecasts(
  marine: MarineForecast | null,
  weather: WeatherForecast | null,
  location: ForecastLocation
): { hours: ConditionSnapshot[]; sunriseByDate: MergedForecast['sunriseByDate'] } {
  const marineByTime = new Map<string, NonNullable<typeof marine>['hours'][number]>();
  if (marine) {
    for (const h of marine.hours) marineByTime.set(h.time, h);
  }

  const weatherByTime = new Map<string, NonNullable<typeof weather>['hours'][number]>();
  if (weather) {
    for (const h of weather.hours) weatherByTime.set(h.time, h);
  }

  // Union of times, sorted.
  const times = [...new Set([...marineByTime.keys(), ...weatherByTime.keys()])].sort();
  const sunriseByDate = buildSunriseByDate(weather);

  const hours: ConditionSnapshot[] = times.map((time) => {
    const m = marineByTime.get(time);
    const w = weatherByTime.get(time);
    const date = time.slice(0, 10);
    const sun = sunriseByDate[date];

    const snapshot: ConditionSnapshot = {
      time,
      windSpeed: w?.windSpeed ?? null,
      windGusts: w?.windGusts ?? null,
      windDirection: w?.windDirection ?? null,
      waveHeight: m?.waveHeight ?? null,
      waveDirection: m?.waveDirection ?? null,
      wavePeriod: m?.wavePeriod ?? null,
      swellHeight: m?.swellWaveHeight ?? null,
      swellDirection: m?.swellWaveDirection ?? null,
      swellPeriod: m?.swellWavePeriod ?? null,
      seaSurfaceTemperature: m?.seaSurfaceTemperature ?? null,
      oceanCurrentVelocity: m?.oceanCurrentVelocity ?? null,
      oceanCurrentDirection: m?.oceanCurrentDirection ?? null,
      seaLevelHeightMsl: m?.seaLevelHeightMsl ?? null,
      temperature: w?.temperature ?? null,
      apparentTemperature: w?.apparentTemperature ?? null,
      precipitation: w?.precipitation ?? null,
      precipitationProbability: w?.precipitationProbability ?? null,
      cloudCover: w?.cloudCover ?? null,
      pressureMsl: w?.pressureMsl ?? null,
      humidity: w?.humidity ?? null,
      visibility: w?.visibility ?? null,
      weatherCode: w?.weatherCode ?? null,
      thunderstorm: w?.thunderstorm ?? null,
      isDaylight: isDaylightAt(time, sun?.sunrise ?? null, sun?.sunset ?? null),
      dataCompleteness: 0,
      missing: []
    };

    const missing: string[] = [];
    let present = 0;
    for (const f of KEY_FIELDS) {
      const v = snapshot[f];
      if (v == null || (typeof v === 'boolean' && v === false && f === 'isDaylight')) {
        if (f !== 'isDaylight') missing.push(f);
      } else if (f !== 'isDaylight') {
        present++;
      }
    }
    snapshot.missing = missing;
    snapshot.dataCompleteness = KEY_FIELDS.length === 0 ? 0 : present / KEY_FIELDS.length;
    return snapshot;
  });

  return { hours, sunriseByDate };
}

/**
 * Snapshot nearest to "now" for the dashboard's current-conditions card.
 * "now" is the wall-clock time at the LOCATION (derived from the location
 * timezone), compared against the provider's local-time series.
 */
export function snapshotNearestNow(
  hours: ConditionSnapshot[],
  nowWallTime: string
): ConditionSnapshot | null {
  if (hours.length === 0) return null;
  const target = nowWallTime.slice(0, 16);
  let best: ConditionSnapshot | null = null;
  let bestDiff = Infinity;
  for (const h of hours) {
    const diff = Math.abs(diffMinutes(h.time, target));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = h;
    }
  }
  return best;
}

function diffMinutes(a: string, b: string): number {
  const toMin = (t: string) => {
    const m = t.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return 0;
    const days = Math.floor(
      Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000
    );
    return days * 1440 + Number(m[4]) * 60 + Number(m[5]);
  };
  return toMin(a) - toMin(b);
}

/** Current wall-clock time (HH:mm) at a given IANA timezone, without a DOM. */
export function wallClockNowInTimezone(tz: string, nowIso: string): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = fmt.formatToParts(new Date(nowIso));
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
    const hh = get('hour') === '24' ? '00' : get('hour');
    return `${get('year')}-${get('month')}-${get('day')}T${hh}:${get('minute')}`;
  } catch {
    return nowIso;
  }
}
