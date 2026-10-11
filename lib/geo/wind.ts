/**
 * Pure wind / direction math.
 */

export type CompassPoint = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

const POINTS: CompassPoint[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

/**
 * Convert a bearing (degrees, 0 = North, clockwise) to the nearest
 * 8-point compass label key.
 */
export function compassFromDegrees(deg: number | null): CompassPoint | null {
  if (deg == null || Number.isNaN(deg)) return null;
  const norm = ((deg % 360) + 360) % 360;
  const idx = Math.round(norm / 45) % 8;
  return POINTS[idx] ?? null;
}

/**
 * Smallest angular difference between two bearings, in [0, 180].
 */
export function bearingDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export type RelativeWind = 'offshore' | 'onshore' | 'alongshore';

/**
 * Classify a wind/wave direction relative to a shoreline facing.
 *
 * `shorelineFacing` is the compass bearing the shore "faces" (the direction
 * from land out to sea). Wind "from" that bearing = offshore; wind "toward"
 * the shore (opposite bearing) = onshore; near-parallel = alongshore.
 *
 * Directions from providers are "from" bearings (meteorological convention).
 * If the user did not record a shoreline facing, classification is null.
 */
export function relativeToShoreline(
  fromBearing: number | null,
  shorelineFacing: number | null
): RelativeWind | null {
  if (fromBearing == null || shorelineFacing == null) return null;
  const diff = bearingDiff(fromBearing, shorelineFacing);
  if (diff <= 30) return 'offshore';
  if (diff >= 150) return 'onshore';
  return 'alongshore';
}

/**
 * True solar-ish daylight check for a wall-clock time, given that day's
 * sunrise/sunset wall times. All inputs are local wall time strings at the
 * same location: 'YYYY-MM-DDTHH:mm'.
 */
export function isDaylightAt(
  time: string,
  sunrise: string | null,
  sunset: string | null
): boolean | null {
  if (!sunrise || !sunset) return null;
  const t = time.slice(0, 16);
  return t > sunrise && t < sunset;
}

/** Daylight duration in hours for a date, from wall-time sunrise/sunset. */
export function daylightDurationHours(
  sunrise: string | null,
  sunset: string | null
): number | null {
  if (!sunrise || !sunset) return null;
  const [dh, dm] = parseWall(sunrise);
  const [sh, sm] = parseWall(sunset);
  if (dh == null || dm == null || sh == null || sm == null) return null;
  return (sh + sm / 60 - (dh + dm / 60) + 24) % 24;
}

function parseWall(t: string): [number | null, number | null] {
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return [null, null];
  return [Number(m[4]), Number(m[5])];
}
